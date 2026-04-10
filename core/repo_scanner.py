import os
import shutil
import stat
import time
import tempfile
from urllib.parse import quote_plus
from git import Repo
from core.scanner import scan_project

# Helper function to fix read-only files on Windows (Required for .git folders)
def remove_readonly(func, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    func(path)

def scan_github_repo(repo_url, user_id, gh_token=None, team_id=None):
    """
    Clones a GitHub repository to a temporary folder, 
    runs the scanner, and then cleans up.
    """
    print(f"🚀 Starting GitHub scan for {repo_url}, user_id: {user_id}")
    
    temp_dir = tempfile.mkdtemp(prefix=f"temp_repo_{user_id}_")

    try:
        # 1. Extract Project Name
        suggested_name = repo_url.split("/")[-1].replace(".git", "")
        print(f"📁 Project name: {suggested_name}")
        
        # 2. Clone the Repository
        clone_url = repo_url
        if gh_token and repo_url.startswith("https://"):
            safe_token = quote_plus(gh_token)
            clone_url = repo_url.replace("https://", f"https://{safe_token}@")
            print("🔐 Using GitHub token for private repo clone")

        print(f"🔄 Cloning repository from {clone_url} to {temp_dir}")
        Repo.clone_from(clone_url, temp_dir)
        print(f"✅ Clone complete. Starting scan for User ID: {user_id}")

        # 3. Trigger the actual scan logic
        scan_result = scan_project(temp_dir, suggested_name, user_id, repo_url, team_id=team_id)
        print(f"📊 Scan result: {scan_result}")

        return scan_result

    except Exception as e:
        print(f"❌ GitHub Scan Error: {e}")
        # Return a structured error so the backend doesn't crash
        return {"status": "failed", "error": str(e)}

    finally:
        # 5. Cleanup - IMPORTANT to release disk space
        try:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, onexc=remove_readonly)
                print(f"🗑️ Cleaned up temp dir: {temp_dir}")
        except Exception as cleanup_error:
            print(f"⚠️ Cleanup warning: {cleanup_error}")
        if os.path.exists(temp_dir):
            print(f"🧹 Cleaning up temp files: {temp_dir}")
            try:
                # Try both naming conventions for Windows compatibility
                shutil.rmtree(temp_dir, onexc=remove_readonly)
            except:
                try:
                    shutil.rmtree(temp_dir, onerror=remove_readonly)
                except Exception as cleanup_error:
                    print(f"⚠️ Cleanup failed: {cleanup_error}")