import os
from core.rules_engine import run_all_checks
from core.report import generate_report
from core.report_service import save_report
from core.js_analyzer import build_dependency_graph, find_used_files, normalize_graph_key
from core.constants import SAFE_FILES, ENTRY_FILES, LOGIC_EXTENSIONS


def scan_project(path, project_name, user_id, repo_url=None, team_id=None):
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
                    "severity": "LOW",
                    "type": "Architecture",
                    "why": f"'{file_name}' is not imported by any other file.",
                    "fix": "Check if this component is needed."
                })

        except Exception as e:
            print(f"⚠️ JS Analyzer failed: {e}")

        # 3. Flatten issue map into final results list
        final_results = []
        for path_key, issues in file_issue_map.items():
            final_results.extend(issues)

        # 4. Finalize and Save
        score, summary = generate_report(final_results)
        scan_id = save_report(project_name, score, summary, final_results, user_id, repo_url, team_id)

        return {
            "status": "success",
            "score": score,
            "issues_found": len(final_results),
            "scan_id": scan_id
        }

    except Exception as scan_error:
        print(f"🔥 Critical Scan Error: {scan_error}")
        return {"status": "failed", "error": str(scan_error)}