import os
import uuid
import hashlib
from core.rules_engine import run_all_checks
from core.report import generate_report
from core.report_service import save_report
from core.js_analyzer import build_dependency_graph, find_used_files, normalize_graph_key
from core.constants import SAFE_FILES, ENTRY_FILES, LOGIC_EXTENSIONS


def extract_exact_code(file_path, line_number):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        if 1 <= line_number <= len(lines):
            return lines[line_number - 1].rstrip("\n")
    except Exception:
        return None


def extract_issue_context(file_path, line_number, context_lines=2):
    if not file_path or not line_number:
        return None, None

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        index = max(0, line_number - 1)
        before = [l.rstrip("\n") for l in lines[max(0, index - context_lines):index]]
        after = [l.rstrip("\n") for l in lines[index + 1: index + 1 + context_lines]]

        return before, after
    except Exception:
        return None, None


def generate_issue_fingerprint(file, line, code):
    raw = f"{file}:{line}:{code}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def scan_project(path, project_name, user_id, repo_url=None, team_id=None, repo_branch=None, commit_sha=None):
    print(f"🚀 [SCANNER] Starting deep analysis: {project_name}")

    scan_id = None
    file_issue_map = {}

    ignore_folders = {'.git', 'node_modules', '__pycache__', 'venv', 'dist', 'build'}

    abs_project_path = os.path.abspath(path)

    try:
        # 1. Run Security Rules
        security_results = run_all_checks(path)
        for issue in security_results:
            file_path = os.path.abspath(issue.get('file', ''))
            if file_path not in file_issue_map:
                file_issue_map[file_path] = []
            file_issue_map[file_path].append(issue)

        # 2. Intelligent Dead Code Detection
        try:
            graph, js_files = build_dependency_graph(path)
            used_files = find_used_files(graph)
            # used_files is a set of forward-slash relative keys WITHOUT extension
            # e.g. {'src/App', 'src/main', 'src/components/Home'}

            used_basenames = {os.path.basename(key) for key in used_files}
            # e.g. {'App', 'Home', 'Landing'}

            # Pre-compute entry basenames for the filename-level skip check
            entry_basenames = {os.path.splitext(ef)[0] for ef in ENTRY_FILES}
            # e.g. {'App', 'main', 'index', 'Main', ...}

            for file in js_files:
                file_name = os.path.basename(file)
                abs_file_path = os.path.abspath(file)

                # Skip pure config / safe files
                if file_name in SAFE_FILES:
                    continue

                # Build the SAME forward-slash relative key (no extension) that
                # build_dependency_graph uses as its graph key.
                # e.g. 'src/components/Home'
                graph_key = normalize_graph_key(abs_file_path, abs_project_path)
                # bare filename without extension, for entry-point check
                bare_name = graph_key.split('/')[-1]  # e.g. 'Home', 'App'

                # Skip entry-point files (nothing is expected to import them)
                if bare_name in entry_basenames:
                    continue

                # If the exact normalized graph key is used, the file is safe.
                if graph_key in used_files:
                    continue

                # Fallback: allow React-style bare-name matching for imports like './components/Home'
                if bare_name in used_basenames:
                    matching_keys = [key for key in used_files if os.path.basename(key) == bare_name]
                    if len(matching_keys) == 1:
                        continue

                if abs_file_path not in file_issue_map:
                    file_issue_map[abs_file_path] = []

                file_issue_map[abs_file_path].append({
                    "title": "Possibly Unused File",
                    "file": file,
                    "line": 1,
                    "code": file_name,
                    "severity": "LOW",
                    "type": "Architecture",
                    "fixable": False,
                    "why": f"'{file_name}' is not imported by any other file.",
                    "fix": "Check if this component is needed."
})

        except Exception as e:
            print(f"⚠️ JS Analyzer failed: {e}")

        # 3. Flatten issue map into final results list
        final_results = []
        for path_key, issues in file_issue_map.items():
            for issue in issues:
                if "id" not in issue:
                    issue["id"] = str(uuid.uuid4())

                raw_file = issue.get("file", path_key)
                abs_file_path = raw_file
                if not os.path.isabs(raw_file):
                    abs_file_path = os.path.abspath(os.path.join(abs_project_path, raw_file))

                if repo_url:
                    try:
                        issue["repo_path"] = os.path.relpath(abs_file_path, abs_project_path).replace(os.sep, "/")
                    except Exception:
                        issue["repo_path"] = raw_file.replace("\\", "/")
                else:
                    issue["repo_path"] = raw_file.replace("\\", "/")

                if issue.get("line") and os.path.exists(abs_file_path):
                    before, after = extract_issue_context(abs_file_path, issue.get("line"))
                    if before is not None:
                        # issue["context_before"] = before
                        issue["context_before"] = "\n".join(before)
                    if after is not None:
                        # issue["context_after"] = after
                        issue["context_after"] = "\n".join(after)

                if issue.get("line") and os.path.exists(abs_file_path):
                    code_line = extract_exact_code(abs_file_path, issue.get("line"))
                    if code_line:
                        issue["code"] = code_line   
        

                if "fingerprint" not in issue:
                    fingerprint_file = issue.get("repo_path", raw_file)
                    fingerprint_line = issue.get("line") or 0
                    fingerprint_code = issue.get("code") or issue.get("title") or issue.get("type") or ""
                    issue["fingerprint"] = generate_issue_fingerprint(
                        fingerprint_file,
                        fingerprint_line,
                        fingerprint_code,
                    )

                    # --- START DEBUG LOGS ---
                print("🧪 ISSUE BEFORE SAVE")
                print(f"File: {issue.get('file')}")
                print(f"Line: {issue.get('line')}")
                print(f"Code: {repr(issue.get('code'))}")
                print(f"Context Before: {issue.get('context_before')}")
                print(f"Context After: {issue.get('context_after')}")
                print("------")
                # --- END DEBUG LOGS ---

                final_results.append(issue)

        # 4. Finalize and Save
        score, summary = generate_report(final_results)
        scan_id = save_report(
            project_name,
            score,
            summary,
            final_results,
            user_id,
            repo_url,
            team_id,
            repo_branch=repo_branch,
            commit_sha=commit_sha,
        )

        return {
            "status": "success",
            "score": score,
            "issues_found": len(final_results),
            "scan_id": scan_id
        }

    except Exception as scan_error:
        print(f"🔥 Critical Scan Error: {scan_error}")
        return {"status": "failed", "error": str(scan_error)}