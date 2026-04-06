import os
from core.rules_engine import run_all_checks
from core.report import generate_report
from core.report_service import save_report
from core.js_analyzer import build_dependency_graph, find_used_files

def get_structure(path):
    """Generates a clean string of the project folder tree."""
    structure = []
    ignore = {'.git', 'node_modules', '__pycache__', 'venv', '.vscode'}

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ignore]
        level = root.replace(path, "").count(os.sep)
        indent = "  " * level
        folder_name = os.path.basename(root) or os.path.basename(os.path.abspath(path))
        structure.append(f"{indent}{folder_name}/")
        for file in files:
            structure.append(f"{indent}  {file}")
    return "\n".join(structure)

def scan_project(path, project_name, user_id, repo_url=None):
    """
    Enhanced Scanner Engine:
    1. Security Analysis
    2. Dead Code Detection
    3. Scoring & DB Persistence
    """
    print(f"🚀 [SCANNER] Starting analysis for: {project_name}")
    
    # --- 🟢 Fix 1: Define scan_id at the top so return doesn't crash ---
    scan_id = None
    total_files = 0
    ignore_folders = {'.git', 'node_modules', '__pycache__', 'venv', 'target', 'dist', '.vscode'}

    try:
        # --- 1. Basic Statistics ---
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in ignore_folders]
            total_files += len(files)

        # --- 2. Run Security Logic ---
        results = run_all_checks(path)
        
        # --- 3. Dead Code Detection ---
        print("🕸️  Building Dependency Graph...")
        try:
            graph, js_files = build_dependency_graph(path)
            used_files = find_used_files(graph)

            for file in js_files:
                file_name = os.path.basename(file)
                if not any(file_name in imp for imp in used_files):
                    entry_points = ["App.js", "App.jsx", "main.js", "main.jsx", "index.js"]
                    if file_name not in entry_points:
                        results.append({
                            "title": "Possibly Unused File (Dead Code)",
                            "file": file,
                            "severity": "LOW",
                            "line": 0,
                            "type": "Architecture",
                            "why": f"The file '{file_name}' is not imported by any other file.",
                            "fix": "Check if this file is still needed. If not, delete it."
                        })
        except Exception as e:
            print(f"⚠️ [ANALYZER SKIP] {e}")

        # --- 4. Generate Score ---
        score, summary = generate_report(results)
        print(f"🔍 [RESULTS] Found {len(results)} total items. Score: {score}/100")

        # --- 5. Save to Database ---
        try:
            # Note: Ensure save_report is imported from core.report_service
            scan_id = save_report(project_name, score, summary, results, user_id, repo_url)
            print(f"✅ [DATABASE] Report saved. ID: {scan_id}")
        except Exception as db_error:
            print(f"❌ [DATABASE ERROR] {db_error}")

        return {
            "status": "success",
            "project_name": project_name,
            "score": score,
            "total_files": total_files,
            "issues_found": len(results),
            "summary": summary,
            "scan_id": scan_id
        }

    except Exception as scan_error:
        print(f"🔥 [CRITICAL ERROR] {scan_error}")
        return {
            "status": "failed",
            "error": str(scan_error),
            "project_name": project_name
        }