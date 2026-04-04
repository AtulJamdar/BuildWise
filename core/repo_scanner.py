import os
import shutil
import stat
from git import Repo
from core.scanner import scan_project

TEMP_DIR = "temp_repo"

# Helper function to fix read-only files on Windows
def remove_readonly(func, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    func(path)

def scan_github_repo(repo_url):
    # 1. Clean old repo if exists
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR, onexc=remove_readonly)

    print("Cloning repository...")

    try:
        # 2. Extract project name from URL automatically
        # Example: https://github.com/AtulJamdar/SyncFlow -> SyncFlow
        suggested_name = repo_url.split("/")[-1].replace(".git", "")
        
        Repo.clone_from(repo_url, TEMP_DIR)
        print(f"✅ Repo '{suggested_name}' cloned")

        # 3. Run scan - pass the suggested name so the user doesn't have to type it
        scan_project(TEMP_DIR, suggested_name)

        # 4. Cleanup using the helper
        shutil.rmtree(TEMP_DIR, onexc=remove_readonly)
        print("🧹 Temp files cleaned")

    except Exception as e:
        print("❌ Error:", e)