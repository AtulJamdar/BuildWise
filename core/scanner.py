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

def scan_project(path, repo_name=None):
    """Main function to scan files, check rules, and get AI feedback."""
    print(f"\nScanning project: {path}\n")

    total_files = 0
    file_types = set()
    ignore_folders = {'.git', 'node_modules', '__pycache__', 'venv'}

    # 1. Basic File Stats
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ignore_folders]
        for file in files:
            total_files += 1
            ext = file.split('.')[-1] if '.' in file else "no-extension"
            file_types.add(ext)

    print(f"Total Files: {total_files}")
    print(f"File Types: {', '.join(file_types)}")

    # 2. Run Security/Best Practice Checks
    print("\n--- Checks ---")
    results = run_all_checks(path)
    score, summary = generate_report(results)

    # 3. Handle Project Name (Auto-detect or User Input)
    if repo_name:
        project_name = repo_name
        print(f"\nTarget Project: {project_name}")
    else:
        project_name = input("\nEnter project name to save report: ")

    # 4. Save to Database
    save_report(project_name, score, summary, results)

    # 5. Display Results in Terminal
    print(f"\nProject Score: {score}/100")
    print("\nSummary:")
    for key, value in summary.items():
        print(f"  - {key}: {value}")

    print("\nIssues Found:")
    if not results:
        print("  ✅ No issues found")
    else:
        # ✅ UPDATED STEP 3: New Output Format
        for issue in results:
            print(f"\n[{issue['severity']}] {issue['title']}")
            print(f"File: {issue['file']}")
            print(f"Why: {issue['why']}")
            print(f"Fix: {issue['fix']}")

    # 6. AI Analysis
    print("\n🤖 Requesting AI Architect Analysis (Groq)...")
    try:
        structure = get_structure(path)
        ai_result = analyze_project(structure) 

        print("\n--- ✨ AI Analysis & Suggestions ---")
        print(ai_result)
        print("-" * 40)
    except Exception as e:
        print(f"\n⚠️ AI analysis skipped or failed: {e}")