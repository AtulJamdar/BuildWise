import os
from core.rules_engine import run_all_checks
from core.report import generate_report
from core.report_service import save_report
from core.ai_analysis import analyze_project

def get_structure(path):
    """Generates a clean string of the project folder tree."""
    structure = []
    ignore = {'.git', 'node_modules', '__pycache__', 'venv', '.vscode'}

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ignore]
        
        level = root.replace(path, "").count(os.sep)
        indent = "  " * level
        
        folder_name = os.path.basename(root)
        if not folder_name:
            folder_name = os.path.basename(os.path.abspath(path))
            
        structure.append(f"{indent}{folder_name}/")

        for file in files:
            structure.append(f"{indent}  {file}")

    return "\n".join(structure)


def scan_project(path, project_name, user_id, repo_url=None):
    """
    Main function to scan files, check rules, and save to DB.
    Updated to handle web-based execution with user_id.
    """
    print(f"🔍 Starting scan for {project_name} (User: {user_id})")
    print(f"📂 Path: {path}")

    total_files = 0
    file_types = set()
    ignore_folders = {'.git', 'node_modules', '__pycache__', 'venv', 'target', 'dist'}

    # 1. Basic File Stats
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ignore_folders]
        for file in files:
            total_files += 1
            ext = file.split('.')[-1] if '.' in file else "no-ext"
            file_types.add(ext)

    print(f"📊 Total Files: {total_files}")

    # 2. Run Security/Best Practice Checks
    print("\n--- Running Security Checks ---")
    results = run_all_checks(path)
    score, summary = generate_report(results)
    
    print(f"🔍 Scan Results: Found {len(results)} issues")
    print(f"📊 Score: {score}, Summary: {summary}")

    # 3. Save to Database (CRITICAL: Pass user_id)
    # This function must be updated in your project_service.py to accept user_id
    try:
        from core.report_service import save_report
        scan_id = save_report(project_name, score, summary, results, user_id, repo_url)
        print(f"✅ Report saved to database successfully with scan_id: {scan_id}")
    except Exception as e:
        print(f"❌ Database Save Failed: {e}")
        raise e

    # 4. AI Analysis (Optional/Background)
    # You can keep this here, but remember this makes the API response slower.
    # It's better to call this via the /ai/suggestions endpoint we made earlier.
    
    # 5. Return JSON-serializable result for the API
    return {
        "status": "success",
        "project_name": project_name,
        "score": score,
        "total_files": total_files,
        "issues_found": len(results),
        "summary": summary,
        "scan_id": scan_id
    }