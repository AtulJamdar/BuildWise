import os
import shutil
import stat
import subprocess
import tempfile
from urllib.parse import quote_plus
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

        gh_token = gh_token or os.getenv("GITHUB_API_TOKEN")
        # 2. Clone the Repository
        clone_url = repo_url
        if gh_token:
            safe_token = quote_plus(gh_token)
            if repo_url.startswith("https://"):
                clone_url = repo_url.replace("https://", f"https://{safe_token}@")
            elif repo_url.startswith("git@github.com:"):
                repo_path = repo_url.split(":", 1)[1]
                clone_url = f"https://{safe_token}@github.com/{repo_path}"
            print("🔐 Using GitHub token for private repo clone")

        print(f"🔄 Cloning repository from {clone_url} to {temp_dir}")
        try:
            clone_proc = subprocess.run(
                ["git", "clone", "--depth", "1", clone_url, temp_dir],
                check=True,
                capture_output=True,
                text=True,
                env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
            )
            print(f"✅ Clone complete. Starting scan for User ID: {user_id}")
        except subprocess.CalledProcessError as e:
            raise Exception(f"Git clone failed: {e.stderr.strip() or e.stdout.strip() or str(e)}")

        current_branch = None
        try:
            branch_proc = subprocess.run(
                ["git", "-C", temp_dir, "rev-parse", "--abbrev-ref", "HEAD"],
                check=True,
                capture_output=True,
                text=True,
            )
            current_branch = branch_proc.stdout.strip()
        except Exception:
            current_branch = None

        commit_sha = None
        try:
            sha_proc = subprocess.run(
                ["git", "-C", temp_dir, "rev-parse", "HEAD"],
                check=True,
                capture_output=True,
                text=True,
            )
            commit_sha = sha_proc.stdout.strip()
        except Exception:
            commit_sha = None

        # 3. Trigger the actual scan logic
        scan_result = scan_project(
            temp_dir,
            suggested_name,
            user_id,
            repo_url,
            team_id=team_id,
            repo_branch=current_branch,
            commit_sha=commit_sha,
        )
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
                shutil.rmtree(temp_dir, onerror=remove_readonly)
                print(f"🗑️ Cleaned up temp dir: {temp_dir}")
        except Exception as cleanup_error:
            print(f"⚠️ Cleanup warning: {cleanup_error}")
        if os.path.exists(temp_dir):
            print(f"🧹 Cleaning up temp files: {temp_dir}")
            try:
                shutil.rmtree(temp_dir, onerror=remove_readonly)
            except Exception as cleanup_error:
                print(f"⚠️ Cleanup failed: {cleanup_error}")