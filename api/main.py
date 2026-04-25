import base64
import os
import secrets
from pydoc import text
import re
import difflib
import json
import time
from difflib import SequenceMatcher

from fastapi import FastAPI, Body, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# --- FastAPI App Initialization ---
app = FastAPI(title="BuildWise API")
from dotenv import load_dotenv
from db.connection import get_connection
from core.fix_engine import generate_fix, apply_fix, generate_diff, validate_code
from core.project_service import get_or_create_project, get_user_projects, get_project_scans, verify_project_access, verify_issue_access, verify_scan_access

# Import your local services
from core.issue_service import get_scan_issues, get_issue_by_id, get_issue_repo_info, update_issue_status, assign_issue, get_issue_activity
from core.scanner import scan_project
from core.user_service import login_user, oauth_login_user, register_user, register_oauth_user, get_user_by_email, generate_reset_token, reset_password, get_user_plan_info, increment_scan_count
from core.team_service import create_team, get_user_teams, add_member_to_team, user_is_team_member, get_team_by_id, get_team_projects as get_team_projects_for_team
from utils.dependencies import get_current_user
from utils.token import generate_invite_token
from utils.email_service import send_invite_email, send_password_reset_email
from core.repo_scanner import scan_github_repo
from core.pricing_request_service import (
    create_pricing_request, get_all_pending_requests, get_pricing_request_by_id,
    get_user_pricing_requests, update_pricing_request_status
)
from core.custom_pricing_service import (
    create_custom_pricing_plan, create_razorpay_order, get_custom_plan_by_id,
    get_user_custom_plans, update_payment_status, get_pending_custom_plans
)
from core.admin_service import (
    admin_login, check_if_admin, get_admin_by_email, create_admin_user, setup_default_admin
)
from core.renewal_service import (
    create_renewal_request, get_renewal_requests_by_user, get_plan_expiry_date,
    update_renewal_payment_status, activate_renewal_plan, cancel_renewal_request
)
import requests
import razorpay
import hmac
import hashlib
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone


def get_env(key, default=None):
    value = os.getenv(key, default)
    return value.strip() if isinstance(value, str) else value


def initialize_secret_key():
    """
    Initialize SECRET_KEY with security-first approach.
    
    - In production: Requires explicit SECRET_KEY environment variable
    - In development: Auto-generates secure temporary key with warning
    - Prevents accidental use of weak defaults
    """
    secret_key = os.getenv("SECRET_KEY")
    
    if not secret_key:
        environment = os.getenv("ENVIRONMENT", "development")
        
        if environment == "production":
            raise RuntimeError(
                "\n" + "="*70 + "\n"
                "❌ CRITICAL SECURITY ERROR:\n"
                "SECRET_KEY environment variable must be set in production.\n\n"
                "Steps to fix:\n"
                "  1. Generate a secure key: python -c 'import secrets; print(secrets.token_urlsafe(32))'\n"
                "  2. Set environment variable: export SECRET_KEY=<generated-key>\n"
                "  3. Restart the application\n"
                "="*70 + "\n"
            )
        else:
            # Development mode: Auto-generate temporary key
            secret_key = secrets.token_urlsafe(32)
            print(
                "\n" + "!"*70 + "\n"
                "⚠️  WARNING: Running in DEVELOPMENT mode\n"
                "Generated temporary SECRET_KEY for this session.\n"
                "Session data will be lost on restart.\n\n"
                "To use a persistent key in development:\n"
                "  1. Generate: python -c 'import secrets; print(secrets.token_urlsafe(32))'\n"
                "  2. Add to .env: SECRET_KEY=<generated-key>\n"
                "  3. Restart the application\n"
                "!"*70 + "\n"
            )
    
    return secret_key


SECRET_KEY = initialize_secret_key()

RAZORPAY_KEY_ID = get_env("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = get_env("RAZORPAY_KEY_SECRET")

GOOGLE_CLIENT_ID = get_env("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = get_env("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = get_env("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
GITHUB_REDIRECT_URI = get_env("GITHUB_REDIRECT_URI", "http://localhost:8000/auth/github/callback")
FRONTEND_URL = get_env("FRONTEND_URL", "http://localhost:5173")

# --- Razorpay Client ---
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# --- OAuth Setup (Manual Registration) ---
oauth = OAuth()

# Load environment variables
load_dotenv()

# Register Google OAuth
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid profile email'},
    )
    print("✅ Google OAuth registered successfully")
else:
    print("⚠️ WARNING: Google OAuth credentials not found in .env")

# Register GitHub OAuth (optional, for future use if needed)
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
if GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET:
    print("✅ GitHub OAuth ready (manual flow)")
else:
    print("⚠️ WARNING: GitHub OAuth credentials not found in .env")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000","http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# --- Session & Cache Control Middleware ---
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

@app.get("/")
def home():
    return {"message": "BuildWise API is online"}

# --- 🔐 AUTHENTICATION ---

@app.post("/auth/register")
def register(data: dict = Body(...)):
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Missing fields")
    
    result = register_user(username=name, email=email, password=password)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return {"message": "User registered successfully"}

@app.post("/auth/login")
def login(data: dict = Body(...)): 
    email = data.get("email")
    password = data.get("password")
    
    auth_data = login_user(email, password)
    if not auth_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return auth_data

# --- ✅ AUTH STATUS (New Gatekeeper Endpoint) ---
@app.get("/auth/status")
def get_auth_status(user_id: int = Depends(get_current_user)):
    """
    Checks if the user has completed their onboarding profile.
    """
    from db.connection import get_connection
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT onboarding_done FROM users WHERE id = %s", (user_id,))
        result = cur.fetchone()
        
        # result[0] is the value of onboarding_done (True/False)
        # We use 'bool()' to ensure it returns a clean True or False
        onboarding_done = bool(result[0]) if result else False
        
        return {"onboarding_done": onboarding_done}
    except Exception as e:
        print(f"❌ Error checking onboarding status: {e}")
        # If there's an error, we assume False so they go to onboarding
        return {"onboarding_done": False}
    finally:
        cur.close()
        conn.close()


def parse_github_repo_url(repo_url: str):
    if not repo_url:
        return None

    if repo_url.startswith("git@github.com:"):
        repo_path = repo_url.split(":", 1)[1]
    elif "github.com/" in repo_url:
        repo_path = repo_url.split("github.com/", 1)[1]
    else:
        return None

    if repo_path.endswith(".git"):
        repo_path = repo_path[:-4]

    repo_path = repo_path.strip("/\n")
    parts = repo_path.split("/")
    if len(parts) < 2:
        return None

    return parts[0], parts[1]


def github_headers(token: str = None):
    headers = {"Accept": "application/vnd.github.v3+json"}
    gh_token = token or os.getenv("GITHUB_API_TOKEN")
    if gh_token:
        headers["Authorization"] = f"token {gh_token}"
    return headers


def get_github_default_branch(owner: str, repo: str, token: str = None):
    url = f"https://api.github.com/repos/{owner}/{repo}"
    response = requests.get(url, headers=github_headers(token))
    response.raise_for_status()
    return response.json().get("default_branch", "main")


def get_github_branch_sha(owner: str, repo: str, branch: str, token: str = None):
    url = f"https://api.github.com/repos/{owner}/{repo}/branches/{branch}"
    response = requests.get(url, headers=github_headers(token))
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"GitHub branch not found: {branch}")
    response.raise_for_status()
    return response.json()["commit"]["sha"]


def get_github_file(owner: str, repo: str, file_path: str, ref: str = None, token: str = None):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
    params = {"ref": ref} if ref else None
    response = requests.get(url, headers=github_headers(token), params=params)
    
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"GitHub file not found: {file_path}")
    
    response.raise_for_status()
    data = response.json()
    content = data.get("content")
    sha = data.get("sha")
    
    if content is None or sha is None:
        raise HTTPException(status_code=500, detail="GitHub response missing file content")
    
    decoded = base64.b64decode(content).decode("utf-8", errors="ignore")
    
    # --- Debug Logs from Image ---
    print(f"📄 Fetching file: {file_path}")
    print(f"📏 Total lines fetched: {len(decoded.splitlines())}")
    # -----------------------------

    return decoded.splitlines(), sha, data.get("path")


def create_github_branch(owner: str, repo: str, base_sha: str, branch_name: str, token: str = None):
    url = f"https://api.github.com/repos/{owner}/{repo}/git/refs"
    response = requests.post(
        url,
        headers=github_headers(token),
        json={"ref": f"refs/heads/{branch_name}", "sha": base_sha},
    )
    if response.status_code == 422:
        raise HTTPException(status_code=409, detail=f"Branch already exists: {branch_name}")
    response.raise_for_status()
    return response.json()


def update_github_file(owner: str, repo: str, file_path: str, branch: str, content: str, sha: str, message: str, token: str = None):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
    encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")
    response = requests.put(
        url,
        headers=github_headers(token),
        json={
            "message": message,
            "content": encoded,
            "sha": sha,
            "branch": branch,
        },
    )
    response.raise_for_status()
    return response.json()


def create_pull_request(owner: str, repo: str, title: str, head: str, base: str, body: str, token: str = None):
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
    response = requests.post(
        url,
        headers=github_headers(token),
        json={
            "title": title,
            "head": head,
            "base": base,
            "body": body,
        },
    )
    response.raise_for_status()
    return response.json()


def collect_candidate_matches(lines, issue, threshold: float = 0.72, max_candidates: int = 5):
    target = normalize_code(issue.get("code"))
    if not target:
        return []

    candidates = []
    for i, line in enumerate(lines):
        score = SequenceMatcher(None, normalize_code(line), target).ratio()
        if score >= threshold:
            candidates.append({
                "line": i + 1,
                "score": round(score, 3),
                "snippet": line.strip(),
            })
    candidates.sort(key=lambda item: item["score"], reverse=True)
    return candidates[:max_candidates]




def fetch_github_file_lines(owner: str, repo: str, file_path: str, ref: str = None):
    headers = {"Accept": "application/vnd.github.v3+json"}
    github_token = os.getenv("GITHUB_API_TOKEN")
    if github_token:
        headers["Authorization"] = f"token {github_token}"

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
    if ref:
        url += f"?ref={ref}"

    response = requests.get(url, headers=headers)
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"GitHub file not found: {file_path}")
    response.raise_for_status()

    data = response.json()
    content = data.get("content")
    if not content:
        raise HTTPException(status_code=500, detail="GitHub response missing file content")

    decoded = base64.b64decode(content).decode("utf-8", errors="ignore")
    return decoded.splitlines()


def normalize_code(text):
    return " ".join((text or "").strip().split())


def get_line_by_number(lines, issue):
    line_no = issue.get("line")
    if isinstance(line_no, int) and 1 <= line_no <= len(lines):
        return line_no
    try:
        line_no = int(line_no)
        if 1 <= line_no <= len(lines):
            return line_no
    except (TypeError, ValueError):
        pass
    return None


def fuzzy_match(lines, issue):
    target = normalize_code(issue.get("code"))
    if not target:
        return None

    best_score = 0.0
    best_line = None
    for i, line in enumerate(lines):
        score = SequenceMatcher(None, normalize_code(line), target).ratio()
        if score > best_score:
            best_score = score
            best_line = i + 1

    return best_line if best_score >= 0.72 else None


def normalize_block(text):
    return " ".join(text.split()) if text else ""

def robust_match(lines, issue):
    target = normalize_block(issue.get("code"))

    # 1. Exact match
    for i, line in enumerate(lines):
        if normalize_block(line) == target:
            return i + 1

    # 2. Context match (stronger)
    before = normalize_block(issue.get("context_before"))
    after = normalize_block(issue.get("context_after"))

    for i in range(len(lines)):
        block = "\n".join(lines[max(0, i-2):i+3])
        block_norm = normalize_block(block)

        if before and before in block_norm:
            return i + 1
        if after and after in block_norm:
            return i + 1

    # 3. Fuzzy fallback
    best_score = 0
    best_line = None

    for i, line in enumerate(lines):
        score = difflib.SequenceMatcher(None, target, normalize_block(line)).ratio()
        if score > best_score:
            best_score = score
            best_line = i + 1

    if best_score > 0.7:
        return best_line

    return None


def get_snippet(lines, line_no, context=5):
    start = max(0, line_no - context)
    end = min(len(lines), line_no + context)
    return "\n".join(lines[start:end]) 


@app.get("/issues/{issue_id}/github-match")
def github_match_issue(issue_id: int, user_id: int = Depends(get_current_user)):
    if not verify_issue_access(issue_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this issue")

    issue = get_issue_by_id(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    repo_info = get_issue_repo_info(issue_id)
    if not repo_info:
        raise HTTPException(status_code=400, detail="Repo info unavailable for this issue")

    repo_url, commit_sha, branch, repo_path = repo_info
    if not repo_url or not repo_path:
        raise HTTPException(status_code=400, detail="Missing repository URL or file path for GitHub matching")

    parsed = parse_github_repo_url(repo_url)
    if not parsed:
        raise HTTPException(status_code=400, detail="Unsupported GitHub repo URL")

    owner, repo_name = parsed
    lines = fetch_github_file_lines(owner, repo_name, repo_path, ref=branch)

    exact_line = robust_match(lines, {
        "code": issue["code"],
        "context_before": issue["context_before"],
        "context_after": issue["context_after"],
        "line": issue["line"],
    })

    matched = exact_line is not None
    matched_snippet = get_snippet(lines, exact_line) if matched else None

    return {
        "issue_id": issue_id,
        "repo_path": repo_path,
        "commit_sha": commit_sha,
        "branch": branch,
        "exact_line": exact_line,
        "matched": matched,
        "matched_snippet": matched_snippet,
        "lines_preview": lines[:6],
    }


@app.post("/issues/{issue_id}/fix-preview")
def preview_fix(issue_id: int, data: dict = Body(...), user_id: int = Depends(get_current_user)):
    if not verify_issue_access(issue_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this issue")

    issue_row = get_issue_by_id(issue_id)
    if not issue_row:
        raise HTTPException(status_code=404, detail="Issue not found")

    repo_info = get_issue_repo_info(issue_id)
    if not repo_info:
        raise HTTPException(status_code=400, detail="Repo info unavailable for this issue")

    repo_url, commit_sha, branch, repo_path = repo_info
    if not repo_url or not repo_path:
        raise HTTPException(status_code=400, detail="Missing repository URL or file path for GitHub preview")

    parsed = parse_github_repo_url(repo_url)
    if not parsed:
        raise HTTPException(status_code=400, detail="Unsupported GitHub repo URL")

    owner, repo_name = parsed
    gh_token = data.get("gh_token") or os.getenv("GITHUB_API_TOKEN")
    ref = branch or get_github_default_branch(owner, repo_name, gh_token)

    lines, sha, _ = get_github_file(owner, repo_name, repo_path, ref=ref, token=gh_token)

    issue = {
        "code": issue_row["code"],
        "title": issue_row["title"],
        "line": issue_row["line"],
        "repo_path": repo_path,
    }

    if not issue["code"]:
        line_no = get_line_by_number(lines, issue)
        if line_no:
            issue["code"] = lines[line_no - 1]

    exact_line = robust_match(lines, issue)
    candidates = []
    if exact_line is None:
        if candidates:
            return {
                "message": "Multiple candidate matches found",
                "candidates": candidates,
            }
        raise HTTPException(status_code=409, detail="Code has changed since the scan. Please rescan.")

    new_code = generate_fix(issue, repo_path)
    new_lines = apply_fix(list(lines), exact_line, new_code)

    combined = "\n".join(new_lines)
    if not validate_code(combined, repo_path):
        raise HTTPException(status_code=400, detail="Generated fix failed syntax validation")

    original_snippet = get_snippet(lines, exact_line)
    print("📌 ORIGINAL SNIPPET:")
    print(original_snippet)
    fixed_snippet = get_snippet(new_lines, exact_line)
    print("📌 FIXED SNIPPET:")
    print(fixed_snippet)
    diff = generate_diff(lines, new_lines)
    return {
        "diff": diff,
        "fixed_code": new_code,
        "line": exact_line,
        "originalSnippet": original_snippet,
        "fixedSnippet": fixed_snippet,
        "candidates": candidates,
    }


@app.post("/issues/{issue_id}/apply-fix")
def apply_fix_issue(issue_id: int, data: dict = Body(...), user_id: int = Depends(get_current_user)):
    
    if not verify_issue_access(issue_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this issue")

    issue_row = get_issue_by_id(issue_id)
    if not issue_row:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    if not issue_row.get("fixable", True): 
        pass

    repo_info = get_issue_repo_info(issue_id)
    if not repo_info:
        raise HTTPException(status_code=400, detail="Repo info unavailable for this issue")

    repo_url, commit_sha, branch, repo_path = repo_info
    if not repo_url or not repo_path:
        raise HTTPException(status_code=400, detail="Missing repository URL or file path for GitHub apply")

    parsed = parse_github_repo_url(repo_url)
    if not parsed:
        raise HTTPException(status_code=400, detail="Unsupported GitHub repo URL")

    owner, repo_name = parsed
    gh_token = data.get("gh_token") or os.getenv("GITHUB_API_TOKEN")
    base_branch = branch or get_github_default_branch(owner, repo_name, gh_token)
    base_sha = get_github_branch_sha(owner, repo_name, base_branch, gh_token)
    lines, sha, _ = get_github_file(owner, repo_name, repo_path, ref=base_branch, token=gh_token)

    

    issue = {
        "code": issue_row["code"],
        "title": issue_row["title"],
        "line": issue_row["line"],
        "repo_path": repo_path,
    }

    if issue.get("code") not in "\n".join(lines):
        print("⚠️ Warning: code not found in file")

    if not issue["code"]:
        line_no = get_line_by_number(lines, issue)
        if line_no:
            issue["code"] = lines[line_no - 1]

    exact_line = robust_match(lines, issue)
    candidates = []
    if exact_line is None:
        if candidates:
            raise HTTPException(status_code=409, detail="Multiple candidate matches found. Please choose the correct line first.")
        raise HTTPException(status_code=409, detail="Code has changed since the scan. Please rescan.")

    new_code = generate_fix(issue, repo_path)
    new_lines = apply_fix(list(lines), exact_line, new_code)
    combined = "\n".join(new_lines)
    if not validate_code(combined, repo_path):
        raise HTTPException(status_code=400, detail="Generated fix failed syntax validation")

    branch_name = f"fix/issue-{issue_id}-{int(time.time())}"
    try:
        create_github_branch(owner, repo_name, base_sha, branch_name, gh_token)
    except HTTPException as exc:
        if exc.status_code == 409:
            branch_name = f"fix/issue-{issue_id}-{int(time.time())}-{os.getpid()}"
            create_github_branch(owner, repo_name, base_sha, branch_name, gh_token)
        else:
            raise

    update_github_file(
        owner,
        repo_name,
        repo_path,
        branch_name,
        combined,
        sha,
        f"Fix issue #{issue_id}: {issue_row['title']}",
        gh_token,
    )

    pr_body = (
        f"This PR fixes issue #{issue_id} detected by BuildWise.\n\n"
        f"**Issue:** {issue_row['title']}\n"
        f"**File:** {repo_path}\n"
        f"**Line:** {exact_line}\n"
        f"**Why:** {issue_row['why']}\n\n"
        "Generated fix is minimal and shown in the dashboard preview."
    )

    pr = create_pull_request(
        owner,
        repo_name,
        f"Fix issue #{issue_id}: {issue_row['title']}",
        branch_name,
        base_branch,
        pr_body,
        gh_token,
    )

    return {
        "branch": branch_name,
        "pr_url": pr.get("html_url"),
        "pr_number": pr.get("number"),
        "diff": generate_diff(lines, new_lines),
    }


@app.post("/auth/forgot-password")
def forgot_password(data: dict = Body(...)):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    token = generate_reset_token(email)
    if not token:
        # Do not reveal whether the email exists for security reasons.
        return {"message": "If that email exists, a reset link has been sent."}

    reset_link = f"{FRONTEND_URL}/reset-password/{token}"
    try:
        send_password_reset_email(email, reset_link)
    except Exception as exc:
        print(f"Failed to send password reset email: {exc}")
        raise HTTPException(status_code=500, detail="Failed to send reset email")

    return {"message": "If that email exists, a reset link has been sent."}

@app.post("/auth/reset-password/{token}")
def reset_password_with_token(token: str, data: dict = Body(...)):
    new_password = data.get("password")
    if not new_password:
        raise HTTPException(status_code=400, detail="Password is required")

    success = reset_password(token, new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    return {"message": "Password reset successful"}

@app.post("/auth/reset-password")
def reset_pw_endpoint(data: dict = Body(...)): 
    token = data.get("token")
    new_password = data.get("password")

    success = reset_password(token, new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    return {"message": "Password reset successful"}

# --- 📁 PROJECTS (Protected & User-Specific) ---

@app.get("/projects")
def get_projects(user_id: int = Depends(get_current_user)):
    from db.connection import get_connection
    projects = get_user_projects(user_id)
    print(f"📋 Fetching projects for user {user_id}: {projects}")

    conn = get_connection()
    cur = conn.cursor()
    
    result = []
    for p in projects:
        project_id = p[0]
        team_id = p[2] if len(p) > 2 else None
        team_name = p[3] if len(p) > 3 else None
        cur.execute("SELECT COUNT(*) FROM reports WHERE project_id = %s", (project_id,))
        scan_count = cur.fetchone()[0]
        print(f"📊 Project {p[1]} (id: {project_id}) has {scan_count} scans")
        
        result.append({
            "id": project_id,
            "name": p[1],
            "team_id": team_id,
            "team_name": team_name,
            "total_scans": scan_count
        })
    
    conn.close()
    return result

@app.get("/projects/{project_id}/scans")
def get_scans(project_id: int, user_id: int = Depends(get_current_user)):
    scans = get_project_scans(project_id, user_id)
    if scans is None:
        raise HTTPException(status_code=403, detail="Access denied to this project")
    return [{"id": s[0], "score": s[1], "created_at": str(s[2])} for s in scans]

# --- 🛠️ ISSUES ---

@app.get("/scans/{scan_id}/issues")
def get_issues(scan_id: int, user_id: int = Depends(get_current_user)):
    if not verify_scan_access(scan_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this scan")
    issues = get_scan_issues(scan_id)
    return [
        {
            "id": i[0],
            "file": i[1],
            "severity": i[2],
            "title": i[3],
            "status": i[4],
            "note": i[5],
            "assigned_to": i[6],
        }
        for i in issues
    ]

@app.get("/issues/{issue_id}")
def get_issue(issue_id: int, user_id: int = Depends(get_current_user)):
    if not verify_issue_access(issue_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this issue")
    
    issue = get_issue_by_id(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # --- Debug issue data (VERY IMPORTANT) ---
    print("🔥 ISSUE DEBUG START")
    print(f"ID: {issue_id}")
    print(f"DB CODE: {repr(issue['code'])}")
    print(f"LINE: {issue['line']}")
    print(f"FILE: {issue['file']}")
    print("🔥 ISSUE DEBUG END")

    # Original logging
    print(f"📝 Fetching issue {issue_id}: File={issue['file']}, Line={issue['line']}, Title={issue['title']}")

    code_snippet = issue["code"]
    github_match = None
    repo_info = get_issue_repo_info(issue_id)

    if not code_snippet and repo_info:
        repo_url, commit_sha, branch, repo_path = repo_info
        if repo_url and repo_path:
            parsed = parse_github_repo_url(repo_url)
            if parsed:
                owner, repo_name = parsed
                try:
                    lines = fetch_github_file_lines(owner, repo_name, repo_path, ref=branch)
                    line_no = get_line_by_number(lines, {"line": issue["line"]})
                    if line_no:
                        code_snippet = get_snippet(lines, line_no)
                        github_match = {
                            "exact_line": line_no,
                            "matched_snippet": code_snippet,
                            "branch": branch,
                        }
                except Exception as e:
                    print(f"❌ ERROR: {e}")

    activity = get_issue_activity(issue_id)
    return {
        "id": issue["id"],
        "file": issue["file"],
        "line": issue["line"],
        "code": issue["code"],
        "code_snippet": code_snippet,
        "github_match": github_match,
        "type": issue["type"],
        "severity": issue["severity"],
        "title": issue["title"],
        "why": issue["why"],
        "fix": issue["fix"],
        "status": issue["status"],
        "note": issue["note"],
        "assigned_to": issue["assigned_to"],
        "assigned_to_name": issue["assigned_to_name"],
        "updated_by": issue["updated_by"],
        "updated_by_name": issue["updated_by_name"],
        "fingerprint": issue["fingerprint"],
        "context_before": issue["context_before"],
        "context_after": issue["context_after"],
        "repo_path": issue["repo_path"],
        "activity": [
            {"action": a[0], "details": a[1], "created_at": str(a[2]), "user": a[3]} for a in activity
        ]
    }

@app.put("/issues/{issue_id}")
def update_issue(issue_id: int, data: dict = Body(...), user_id: int = Depends(get_current_user)):
    if not verify_issue_access(issue_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this issue")
    status_val = data.get("status")
    if status_val not in ["OPEN", "FIXED", "IGNORED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    update_issue_status(issue_id, status_val, user_id)
    return {"message": "Updated"}

@app.post("/issues/{issue_id}/assign")
def assign_issue_endpoint(issue_id: int, data: dict = Body(...), user_id: int = Depends(get_current_user)):
    if not verify_issue_access(issue_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this issue")

    assignee_id = data.get("user_id")
    if not assignee_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    assign_issue(issue_id, assignee_id, user_id)
    return {"message": "Assigned"}

# --- 🧠 AI SUGGESTIONS ---

@app.post("/ai/suggestions")
def get_ai_suggestions(data: dict = Body(...), user_id: int = Depends(get_current_user)):
    """Provide AI suggestions based on scan results. Free plan gets basic suggestions."""
    try:
        issues = data.get("issues", [])
        user_plan = data.get("plan", "free")
        
        if not issues:
            return {"suggestions": ["No issues detected in your code. Great job!"]}
        
        # Basic AI suggestions for all plans
        suggestions = []
        
        for issue in issues:
            issue_type = issue.get("type", "").lower()
            severity = issue.get("severity", "")
            file_name = issue.get("file", "")
            
            # Generate basic suggestions based on issue type
            if "unused" in issue_type:
                suggestions.append(f"🗑️ Remove unused code: {file_name} - Keeping unused code increases complexity and maintenance burden.")
            elif "security" in issue_type.lower():
                suggestions.append(f"🔒 Security Issue: {file_name} - Review this file for potential vulnerabilities and apply security best practices.")
            elif "dependency" in issue_type.lower():
                suggestions.append(f"📦 Dependency Issue: {file_name} - Consider updating or removing unnecessary dependencies to reduce bundle size.")
            elif "duplicate" in issue_type.lower():
                suggestions.append(f"📋 Code Duplication: {file_name} - Extract common logic into reusable functions or utilities.")
            elif "complexity" in issue_type.lower():
                suggestions.append(f"🔄 Complex Logic: {file_name} - Consider breaking down complex functions into smaller, more manageable pieces.")
            else:
                suggestions.append(f"✏️ Code Quality: {file_name} - Review and refactor for better maintainability and performance.")
        
        # Add plan-specific suggestions
        if user_plan != "free":
            suggestions.insert(0, "💡 Pro Plan Unlocked: You have access to advanced AI analysis and recommendations.")
        else:
            suggestions.append("⭐ Upgrade to Pro for advanced AI suggestions, detailed analysis, and team collaboration features.")
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        print(f"[AI Suggestions] ❌ Error: {str(e)}")
        return {"suggestions": ["Unable to generate suggestions at this time. Please try again later."]}
    

@app.post("/auth/onboarding")
def save_onboarding(data: dict = Body(...), user_id: int = Depends(get_current_user)):
    from db.connection import get_connection
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            UPDATE users
            SET role_type=%s,
                experience_level=%s,
                tech_stack=%s,
                onboarding_done=TRUE
            WHERE id=%s
            """,
            (
                data.get("role_type"),
                data.get("experience_level"),
                data.get("tech_stack"),
                user_id
            )
        )
        conn.commit()
        return {"message": "Onboarding saved"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {str(e)}")
    finally:
        cur.close()
        conn.close()

# --- 👤 PROFILE MANAGEMENT ---

@app.get("/profile")
def get_profile(user_id: int = Depends(get_current_user)):
    """
    Retrieve user profile information including name, email, role, experience, and tech stack.
    """
    from db.connection import get_connection
    print(f"📋 Fetching profile for user_id: {user_id}")

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT username, email, role_type, experience_level, tech_stack, onboarding_done
            FROM users
            WHERE id=%s
            """,
            (user_id,)
        )

        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        print(f"✅ Profile retrieved: {user[0]}")
        
        plan_row = None
        try:
            cur.execute(
                "SELECT plan, scan_count, scan_limit, trial_ends FROM users WHERE id=%s",
                (user_id,)
            )
            plan_row = cur.fetchone()
        except Exception:
            plan_row = None

        return {
            "name": user[0],
            "email": user[1],
            "role_type": user[2],
            "experience_level": user[3],
            "tech_stack": user[4],
            "plan": plan_row[0] if plan_row else "free",
            "scan_count": plan_row[1] if plan_row else 0,
            "scan_limit": plan_row[2] if plan_row else 10,
            "trial_ends": str(plan_row[3]) if plan_row and plan_row[3] else None,
            "is_onboarded": bool(user[5]) if len(user) > 5 else False,
        }
    except Exception as e:
        print(f"❌ Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@app.get("/user/profile")
def get_user_profile(user_id: int = Depends(get_current_user)):
    from db.connection import get_connection
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT onboarding_done FROM users WHERE id = %s",
            (user_id,)
        )
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        return {"is_onboarded": bool(result[0])}
    except Exception as e:
        print(f"❌ Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@app.get("/plan")
def get_plan(user_id: int = Depends(get_current_user)):
    plan_info = get_user_plan_info(user_id)
    if not plan_info:
        raise HTTPException(status_code=404, detail="User plan not found")

    trial_active = False
    if plan_info.get("trial_ends"):
        trial_ends = plan_info["trial_ends"]
        if isinstance(trial_ends, str):
            trial_ends = datetime.fromisoformat(trial_ends)
        trial_active = datetime.now(timezone.utc) < trial_ends

    return {
        "plan": plan_info["plan"],
        "scan_count": plan_info["scan_count"],
        "scan_limit": plan_info["scan_limit"],
        "trial_ends": str(plan_info["trial_ends"]) if plan_info["trial_ends"] else None,
        "trial_active": trial_active
    }


@app.get("/user/usage")
def get_usage(user_id: int = Depends(get_current_user)):
    from db.connection import get_connection

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT plan, scan_count, scan_limit
        FROM users
        WHERE id=%s
    """, (user_id,))

    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "plan": user[0] or "free",
        "used": user[1] or 0,
        "limit": user[2] or 0,
    }


@app.post("/teams")
def create_team_endpoint(data: dict = Body(...), user_id: int = Depends(get_current_user)):
    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Team name is required")

    team_id = create_team(name, user_id)
    return {"message": "Team created successfully", "team_id": team_id}


@app.get("/teams")
def list_teams(user_id: int = Depends(get_current_user)):
    teams = get_user_teams(user_id)
    return [
        {"id": t[0], "name": t[1], "owner_id": t[2], "role": t[3]}
        for t in teams
    ]


@app.post("/teams/invite")
def invite_team_member(data: dict = Body(...), user_id: int = Depends(get_current_user)):
    from db.connection import get_connection

    team_id = data.get("team_id")
    email = data.get("email")

    if not team_id or not email:
        raise HTTPException(status_code=400, detail="team_id and email are required")

    conn = get_connection()
    cur = conn.cursor()
    try:
        # Ensure team exists and the user is allowed to invite.
        cur.execute("SELECT id FROM teams WHERE id = %s", (team_id,))
        team = cur.fetchone()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        cur.execute(
            "SELECT role FROM team_members WHERE team_id = %s AND user_id = %s",
            (team_id, user_id)
        )
        role_row = cur.fetchone()
        if not role_row or role_row[0] not in ("admin", "owner"):
            raise HTTPException(status_code=403, detail="Only team admins can invite members")

        token = generate_invite_token()
        cur.execute(
            "INSERT INTO invitations (team_id, email, token) VALUES (%s, %s, %s)",
            (team_id, email.lower(), token)
        )
        conn.commit()

        invite_link = f"{FRONTEND_URL}/accept-invite/{token}"
        send_invite_email(email, invite_link)

        return {"message": "Invitation email sent successfully."}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        print(f"❌ Invite email failed: {exc}")
        raise HTTPException(status_code=500, detail="Failed to send invitation email")
    finally:
        cur.close()
        conn.close()


@app.get("/accept-invite/{token}")
def accept_invite(token: str, user_id: int = Depends(get_current_user)):
    from db.connection import get_connection

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        user_row = cur.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")

        current_user_email = user_row[0].lower()
        cur.execute(
            "SELECT team_id, email, status FROM invitations WHERE token = %s",
            (token,)
        )
        invite = cur.fetchone()

        if not invite or invite[2] != "pending":
            raise HTTPException(status_code=404, detail="Invalid or expired invite")

        team_id, invite_email, status = invite
        if current_user_email != invite_email.lower():
            raise HTTPException(status_code=403, detail="This invite was sent to a different email address")

        cur.execute(
            "SELECT 1 FROM team_members WHERE team_id = %s AND user_id = %s",
            (team_id, user_id)
        )
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO team_members (team_id, user_id, role) VALUES (%s, %s, %s)",
                (team_id, user_id, "member")
            )

        cur.execute(
            "UPDATE invitations SET status = 'accepted' WHERE token = %s",
            (token,)
        )
        conn.commit()
        return {"message": "Joined team successfully."}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        print(f"❌ Accept invite failed: {exc}")
        raise HTTPException(status_code=500, detail="Unable to accept invite")
    finally:
        cur.close()
        conn.close()


@app.get("/teams/{team_id}/projects")
def get_team_projects(team_id: int, user_id: int = Depends(get_current_user)):
    if not user_is_team_member(user_id, team_id):
        raise HTTPException(status_code=403, detail="Access denied to this team")

    projects = get_team_projects_for_team(team_id)
    return [{"id": p[0], "name": p[1]} for p in projects]


@app.put("/profile")
def update_profile(
    data: dict = Body(...),
    user_id: int = Depends(get_current_user)
):
    """
    Update user profile information (name, role, experience level, tech stack).
    """
    from db.connection import get_connection
    print(f"✏️ Updating profile for user_id: {user_id}")
    print(f"📝 Update data: {data}")

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            UPDATE users
            SET username=%s,
                role_type=%s,
                experience_level=%s,
                tech_stack=%s
            WHERE id=%s
            """,
            (
                data.get("name"),
                data.get("role_type"),
                data.get("experience_level"),
                data.get("tech_stack"),
                user_id
            )
        )

        conn.commit()
        print(f"✅ Profile updated successfully for user_id: {user_id}")
        return {"message": "Profile updated successfully"}
    except Exception as e:
        conn.rollback()
        print(f"❌ Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@app.post("/scan")
async def run_security_scan(data: dict = Body(...), user_id: int = Depends(get_current_user)):
    repo_url = data.get("repo_url")
    gh_token = data.get("gh_token") or os.getenv("GITHUB_API_TOKEN")
    team_id = data.get("team_id")

    if not repo_url:
        raise HTTPException(status_code=400, detail="Repository URL is required")

    plan_info = get_user_plan_info(user_id)
    if not plan_info:
        raise HTTPException(status_code=404, detail="User plan not found")

    current_plan = plan_info["plan"].lower()
    trial_active = False
    if plan_info.get("trial_ends"):
        trial_ends = plan_info["trial_ends"]
        if isinstance(trial_ends, str):
            trial_ends = datetime.fromisoformat(trial_ends)
        trial_active = datetime.now(timezone.utc) < trial_ends

    # Scan limit check - Business and Team plans have unlimited scans
    if current_plan not in ["business", "team"] and not trial_active:
        if plan_info["scan_count"] >= plan_info["scan_limit"]:
            raise HTTPException(status_code=403, detail=f"Scan limit reached ({plan_info['scan_count']}/{plan_info['scan_limit']}). Upgrade to Pro or Business plan.")

    if team_id:
        if not user_is_team_member(user_id, team_id):
            raise HTTPException(status_code=403, detail="You must be a team member to scan for this team.")

    print(f"🔍 Scan request received for repo_url: {repo_url}, user_id: {user_id}, team_id: {team_id}")

    try:
        if "github.com" in repo_url:
            print(f"🌍 Detected GitHub URL. Cloning and Scanning...")
            result = scan_github_repo(repo_url, user_id, gh_token, team_id=team_id)
        else:
            from core.scanner import scan_project
            project_name = repo_url.split("/")[-1]
            result = scan_project(repo_url, project_name, user_id, repo_url, team_id=team_id)

        if result.get("status") != "success":
            print(f"❌ Scan failed: {result}")
            raise HTTPException(status_code=500, detail=result.get("error") or "Scan failed")

        increment_scan_count(user_id)

        print(f"✅ Scan completed successfully: {result}")
        return {"message": "Scan completed successfully", "details": result}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Scan Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/create-order")
def create_order(user_id: int = Depends(get_current_user)):
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay configuration missing")

    try:
        order = razorpay_client.order.create({
            "amount": 99900,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"user_id": str(user_id)},
        })

        return {
            "key_id": RAZORPAY_KEY_ID,
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
        }

    except Exception as e:
        msg = str(e)
        print(f"🔥 Razorpay Order Error: {e}")
        if "authentication" in msg.lower() or "401" in msg.lower():
            raise HTTPException(
                status_code=500,
                detail="Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
            )
        raise HTTPException(status_code=500, detail=msg)


@app.post("/verify-payment")
def verify_payment(data: dict = Body(...), user_id: int = Depends(get_current_user)):
    order_id = data.get("order_id")
    payment_id = data.get("payment_id")
    signature = data.get("signature")

    if not order_id or not payment_id or not signature:
        raise HTTPException(status_code=400, detail="Missing payment details")

    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay configuration missing")

    generated_signature = hmac.new(
        bytes(RAZORPAY_KEY_SECRET, "utf-8"),
        bytes(f"{order_id}|{payment_id}", "utf-8"),
        hashlib.sha256
    ).hexdigest()

    if generated_signature != signature:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    from db.connection import get_connection
    conn = get_connection()
    cur = conn.cursor()
    
    # Upgrade user to Pro plan (100 scans/month, no team features)
    cur.execute(
        "UPDATE users SET plan=%s, scan_limit=%s, scan_count=%s WHERE id=%s",
        ("pro", 100, 0, user_id)
    )
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Payment successful! You have been upgraded to Pro plan (100 scans/month)."}


@app.post("/business-inquiry")
def business_inquiry(data: dict = Body(...), user_id: int = Depends(get_current_user)):
    """
    Handle Business plan inquiries. Stores inquiry in DB and attempts to send email notification.
    """
    company_name = data.get("company_name", "")
    team_size = data.get("team_size", "")
    requirements = data.get("requirements", "")
    
    try:
        from db.connection import get_connection
        
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT email, username FROM users WHERE id=%s", (user_id,))
        user_row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_email, username = user_row
        
        # Store inquiry in DB for tracking
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO business_inquiries (user_id, company_name, team_size, requirements, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            """,
            (user_id, company_name, team_size, requirements)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        # Attempt to send email notification (optional - won't fail if not configured)
        try:
            from utils.email_service import send_email
            
            admin_email = os.getenv("EMAIL_SENDER")
            if admin_email:
                email_body = f"""New Business Plan Inquiry:

User: {username} ({user_email})
Company: {company_name}
Team Size: {team_size}
Requirements: {requirements}

Please contact the user with pricing details and next steps."""
                
                send_email(
                    admin_email,
                    "New BuildWise Business Plan Inquiry",
                    email_body
                )
                print(f"[Business Inquiry] ✅ Email sent to admin for {username}")
            else:
                print(f"[Business Inquiry] ⚠️ Admin email not configured. Inquiry stored in DB only.")
        except Exception as email_error:
            print(f"[Business Inquiry] ⚠️ Email notification failed: {str(email_error)}. Inquiry still stored in DB.")
        
        print(f"[Business Inquiry] ✅ Inquiry received from {username}")
        return {"message": "Thank you! We have received your inquiry. Our team will contact you shortly."}
        
    except Exception as e:
        print(f"[Business Inquiry] ❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# --- 🐙 GITHUB OAUTH ENDPOINTS ---

@app.get("/auth/google")
async def google_login(request: Request):
    """
    Google OAuth login redirect endpoint with error handling.
    """
    try:
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            print("[Google] ❌ Missing Google OAuth credentials in .env")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_config_missing")
        
        print(f"[Google] 🔁 Initiating OAuth flow, redirect_uri: {GOOGLE_REDIRECT_URI}")
        return await oauth.google.authorize_redirect(request, redirect_uri=GOOGLE_REDIRECT_URI)
    
    except AttributeError as e:
        print(f"[Google] ❌ OAuth client not registered: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_not_configured")
    
    except Exception as e:
        print(f"[Google] ❌ Unexpected error during Google login: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_login_error")


@app.get("/auth/google/callback")
async def google_callback(request: Request):
    """
    Google OAuth callback with robust error handling.
    """
    try:
        print(f"[Google] Starting OAuth callback...")
        token = await oauth.google.authorize_access_token(request)
        user = token.get("userinfo")

        if not user:
            print(f"[Google] No userinfo in token, attempting to parse ID token...")
            try:
                user = await oauth.google.parse_id_token(request, token)
            except Exception as parse_err:
                print(f"[Google] ❌ ID token parse failed: {parse_err}")
                return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_parse_error")

        email = user.get("email")
        name = user.get("name") or user.get("email") or "Google User"

        if not email:
            print(f"[Google] ❌ No email returned from Google")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=no_email")

        print(f"[Google] User: {name} ({email})")
        register_user(name, email, "google_user")
        
        auth_data = oauth_login_user(email)
        if auth_data and "access_token" in auth_data:
            app_token = auth_data.get("access_token")
            print(f"[Google] Login successful, generating JWT token")
            return RedirectResponse(url=f"{FRONTEND_URL}/oauth-success?token={app_token}")
        else:
            print(f"[Google] JWT token generation failed")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=auth_failed")

    except Exception as e:
        print(f"[Google] ❌ Unexpected error: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_error")


@app.get("/auth/github")
def github_login():
    client_id = os.getenv("GITHUB_CLIENT_ID")
    redirect_uri = GITHUB_REDIRECT_URI
    # Request access to repo scope so private repositories can be listed and cloned
    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=repo%20user:email"
    return {"url": url}

@app.get("/auth/github/callback")
def github_callback(code: str):
    """
    GitHub OAuth callback with robust error handling and network timeout management.
    """
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    REQUEST_TIMEOUT = 10  # seconds

    try:
        # 1. Exchange code for GitHub Access Token
        print(f"[GitHub] Exchanging code for access token...")
        token_res = requests.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            },
            timeout=REQUEST_TIMEOUT,  # Prevent hanging indefinitely
        )
        token_res.raise_for_status()  # Raise exception for bad status codes
        access_token = token_res.json().get("access_token")

        if not access_token:
            error_msg = token_res.json().get("error_description", "No access token returned")
            print(f"[GitHub] Token exchange failed: {error_msg}")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=token_exchange_failed")

        print(f"[GitHub] Successfully obtained access token")

        # 2. Get User Info from GitHub API
        print(f"[GitHub] Fetching user profile...")
        user_res = requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {access_token}"},
            timeout=REQUEST_TIMEOUT,
        )
        user_res.raise_for_status()
        user_data = user_res.json()

        # Handle cases where email might be private
        email = user_data.get("email") or f"{user_data.get('login')}@github.com"
        name = user_data.get("name") or user_data.get("login")
        print(f"[GitHub] User: {name} ({email})")

        # 3. Register the user if they do not already exist
        user_exists = get_user_by_email(email)
        if not user_exists:
            print(f"[GitHub] Creating new user: {email}")
            result = register_oauth_user(name, email, "github_oauth_dummy_pass")
            if not result.get("success"):
                print(f"[GitHub] User creation warning: {result.get('message')}")
        else:
            print(f"[GitHub] User already exists: {email}")

        # 4. Generate BuildWise JWT token
        auth_data = oauth_login_user(email)
        
        if auth_data and "access_token" in auth_data:
            app_token = auth_data.get("access_token")
            print(f"[GitHub] Login successful, generating JWT token")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/oauth-success?token={app_token}&gh_token={access_token}"
            )
        else:
            print(f"[GitHub] JWT token generation failed")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=auth_failed")

    except requests.exceptions.ConnectTimeout:
        print(f"[GitHub] ❌ Connection timeout - GitHub API unreachable. Check internet connection.")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=github_timeout")
    
    except requests.exceptions.ReadTimeout:
        print(f"[GitHub] ❌ Read timeout - GitHub API took too long to respond.")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=github_timeout")
    
    except requests.exceptions.ConnectionError as e:
        print(f"[GitHub] ❌ Connection error: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=github_connection_error")
    
    except requests.exceptions.RequestException as e:
        print(f"[GitHub] ❌ Request error: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=github_request_error")
    
    except Exception as e:
        print(f"[GitHub] ❌ Unexpected error: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=unexpected_error")

@app.get("/github/repos")
def get_github_repos(token: str = None):
    """
    Fetches the list of repositories for the authenticated GitHub user.
    """
    # Note: 'token' here is the GitHub access token, not our app JWT
    token = token or os.getenv("GITHUB_API_TOKEN")
    if not token:
        return []

    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
    
    try:
        # Fetch up to 100 recent repos
        response = requests.get(
            "https://api.github.com/user/repos?sort=updated&per_page=100", 
            headers=headers
        )
        
        if response.status_code != 200:
            return []

        repos = response.json()
        # Clean the data to only send what the frontend needs
        return [
            {
                "name": r["full_name"],
                "url": r["clone_url"],
                "private": r.get("private", False),
            }
            for r in repos
        ]
    except Exception as e:
        print(f"❌ GitHub API Error: {e}")
        return []


# ============================================================================
# 💼 ADMIN PANEL - CUSTOM PRICING MANAGEMENT
# ============================================================================

# --- INITIALIZATION ---
# Setup default admin on startup
try:
    setup_default_admin()
except Exception as e:
    print(f"⚠️  Default admin setup warning: {e}")


# --- ADMIN AUTHENTICATION ENDPOINTS ---

@app.post("/auth/admin/login")
def admin_login_endpoint(credentials: dict = Body(...)):
    """
    Admin login endpoint
    Credentials: {email, password}
    Returns: JWT token and admin details
    """
    email = credentials.get("email", "").strip()
    password = credentials.get("password", "")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    result = admin_login(email, password)
    
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["message"])
    
    return {
        "success": True,
        "access_token": result["access_token"],
        "token_type": result["token_type"],
        "admin_id": result["admin_id"],
        "admin_name": result["admin_name"],
        "role": result["role"]
    }


# --- CUSTOMER PRICING REQUEST ENDPOINTS ---

@app.post("/api/custom-pricing/request")
def submit_pricing_request(request_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    Customer submits a custom pricing request
    Payload: {
        company_name, team_size, scans_per_month, 
        specific_features, budget_min, budget_max
    }
    """
    try:
        company_name = request_data.get("company_name", "").strip()
        team_size = request_data.get("team_size")
        scans_per_month = request_data.get("scans_per_month")
        specific_features = request_data.get("specific_features", "")
        budget_min = request_data.get("budget_min")
        budget_max = request_data.get("budget_max")
        
        # Validation
        if not company_name:
            raise HTTPException(status_code=400, detail="Company name is required")
        if not budget_min or not budget_max:
            raise HTTPException(status_code=400, detail="Budget range is required")
        
        result = create_pricing_request(
            user_id=current_user["id"],
            company_name=company_name,
            team_size=team_size,
            scans_per_month=scans_per_month,
            specific_features=specific_features,
            budget_min=budget_min,
            budget_max=budget_max
        )
        
        if result["success"]:
            return {
                "success": True,
                "request_id": result["request_id"],
                "message": "✅ Pricing request submitted successfully. Admin will review it soon."
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error submitting pricing request: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit pricing request")


@app.get("/api/custom-pricing/my-requests")
def get_my_pricing_requests(current_user = Depends(get_current_user)):
    """
    Get customer's own pricing requests
    """
    try:
        requests = get_user_pricing_requests(current_user["id"])
        return {
            "success": True,
            "requests": requests,
            "count": len(requests)
        }
    except Exception as e:
        print(f"❌ Error fetching pricing requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch requests")


@app.get("/api/custom-pricing/request/{request_id}")
def get_pricing_request_details(request_id: int, current_user = Depends(get_current_user)):
    """
    Get details of a specific pricing request
    """
    try:
        request_data = get_pricing_request_by_id(request_id)
        
        if not request_data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Verify user owns this request or is admin
        if request_data["user_id"] != current_user["id"] and current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Unauthorized access")
        
        return {
            "success": True,
            "request": request_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching request details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch request details")


# --- ADMIN PRICING MANAGEMENT ENDPOINTS ---

@app.get("/admin/api/pricing-requests")
def admin_get_pending_requests(current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Get all pending pricing requests
    """
    try:
        # Check admin role
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        requests = get_all_pending_requests()
        return {
            "success": True,
            "requests": requests,
            "count": len(requests)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching pending requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending requests")


@app.get("/admin/api/pricing-requests/{request_id}")
def admin_get_request_details(request_id: int, current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Get full details of a pricing request for review
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        request_data = get_pricing_request_by_id(request_id)
        
        if not request_data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return {
            "success": True,
            "request": request_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching request: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch request")


@app.post("/admin/api/pricing-requests/{request_id}/approve")
def admin_approve_pricing(request_id: int, approval_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Approve a pricing request and create custom pricing plan
    Payload: {
        custom_price, scans_per_month, features, validity_days, approval_notes
    }
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get request details
        request_data = get_pricing_request_by_id(request_id)
        if not request_data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Parse approval data
        custom_price = approval_data.get("custom_price")
        scans_per_month = approval_data.get("scans_per_month")
        features = approval_data.get("features", [])
        validity_days = approval_data.get("validity_days", 365)
        approval_notes = approval_data.get("approval_notes", "")
        
        if not custom_price or not scans_per_month:
            raise HTTPException(status_code=400, detail="Price and scans per month required")
        
        # Update pricing request status to approved (pass customer email for potential email)
        update_pricing_request_status(
            request_id,
            "approved",
            current_user["id"],
            approval_notes,
            customer_email=request_data.get("customer_email"),
            company_name=request_data.get("company_name")
        )
        
        # Create custom pricing plan
        plan_result = create_custom_pricing_plan(
            pricing_request_id=request_id,
            user_id=request_data["user_id"],
            custom_price=custom_price,
            scans_per_month=scans_per_month,
            features=features,
            validity_days=validity_days,
            admin_id=current_user["id"],
            approval_notes=approval_notes,
            send_email_approval=True
        )
        
        if plan_result["success"]:
            return {
                "success": True,
                "plan_id": plan_result["plan_id"],
                "message": "✅ Pricing approved. Custom plan created. Next: Create Razorpay payment link"
            }
        else:
            raise HTTPException(status_code=400, detail=plan_result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error approving pricing request: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve request")


@app.post("/admin/api/pricing-requests/{request_id}/reject")
def admin_reject_pricing(request_id: int, rejection_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Reject a pricing request
    Payload: {admin_notes}
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get request details for email
        request_data = get_pricing_request_by_id(request_id)
        if not request_data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        admin_notes = rejection_data.get("admin_notes", "Request rejected")
        
        result = update_pricing_request_status(
            request_id,
            "rejected",
            current_user["id"],
            admin_notes,
            customer_email=request_data.get("customer_email"),
            company_name=request_data.get("company_name")
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "✅ Pricing request rejected. Customer notified via email."
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error rejecting request: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject request")


# --- CUSTOM PRICING PAYMENT ENDPOINTS ---

@app.get("/api/custom-pricing/plan/{plan_id}")
def get_custom_plan_details(plan_id: int, current_user = Depends(get_current_user)):
    """
    Get custom pricing plan details (customer view)
    Includes payment link if available
    """
    try:
        plan = get_custom_plan_by_id(plan_id)
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Verify user owns this plan
        if plan["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized access")
        
        return {
            "success": True,
            "plan": plan
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch plan")


@app.post("/admin/api/pricing-plans/{plan_id}/create-razorpay-order")
def admin_create_razorpay_order(plan_id: int, current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Create Razorpay order for custom pricing plan
    This generates payment link to send to customer
    Automatically sends payment link email to customer
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        plan = get_custom_plan_by_id(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Create Razorpay order
        try:
            razorpay_order = razorpay_client.order.create(
                {
                    "amount": int(plan["custom_price"] * 100),  # In paise
                    "currency": "INR",
                    "receipt": f"custom_plan_{plan_id}",
                    "payment_capture": 1
                }
            )
            
            order_id = razorpay_order["id"]
            
            # Generate payment link (frontend will use this)
            # For now, we'll create a simple checkout URL
            payment_link = f"{BACKEND_URL}/api/checkout/custom-plan/{plan_id}?order_id={order_id}"
            
            # Store order details and send email to customer
            order_result = create_razorpay_order(plan_id, order_id, payment_link, send_email=True)
            
            if order_result["success"]:
                return {
                    "success": True,
                    "order_id": order_id,
                    "payment_link": payment_link,
                    "amount": plan["custom_price"],
                    "message": f"✅ Razorpay order created and payment link sent to customer"
                }
            else:
                raise HTTPException(status_code=400, detail=order_result["message"])
                
        except razorpay.errors.BadRequestError as e:
            print(f"❌ Razorpay error: {e}")
            raise HTTPException(status_code=400, detail=f"Razorpay error: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating Razorpay order: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")


@app.get("/admin/api/pending-payments")
def admin_get_pending_payments(current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Get all pending custom plan payments
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        plans = get_pending_custom_plans()
        return {
            "success": True,
            "pending_plans": plans,
            "count": len(plans)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching pending payments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending payments")


# --- RAZORPAY WEBHOOK ENDPOINT ---

@app.post("/webhooks/razorpay/custom-pricing")
async def razorpay_custom_pricing_webhook(request: Request):
    """
    Razorpay webhook for custom pricing payments
    Handles payment success confirmation
    """
    try:
        payload = await request.json()
        
        # Verify webhook signature (for production)
        # signature_received = request.headers.get("X-Razorpay-Signature")
        # if not verify_razorpay_signature(payload, signature_received):
        #     raise HTTPException(status_code=400, detail="Invalid signature")
        
        event_type = payload.get("event")
        event_data = payload.get("payload", {}).get("payment", {})
        
        # Handle payment.authorized event (payment successful)
        if event_type == "payment.authorized":
            razorpay_payment_id = event_data.get("id")
            razorpay_order_id = event_data.get("order_id")
            
            # Find custom plan by razorpay order ID
            # This would typically be a DB lookup
            # For now, we'll need to find plan by order_id
            
            print(f"✅ Payment authorized - Order: {razorpay_order_id}, Payment: {razorpay_payment_id}")
            
            # Note: In production, you'd query the DB to find which plan has this order_id
            # Then update the plan status to 'paid'
            
            return {"status": "ok"}
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/webhooks/razorpay/renewal")
async def razorpay_renewal_webhook(request: Request):
    """
    Razorpay webhook for plan renewal payments
    Handles renewal payment confirmation and plan activation
    """
    try:
        payload = await request.json()
        event_type = payload.get("event")
        event_data = payload.get("payload", {}).get("payment", {})
        
        # Handle payment.authorized event (payment successful)
        if event_type == "payment.authorized":
            razorpay_payment_id = event_data.get("id")
            razorpay_order_id = event_data.get("order_id")
            
            # Find renewal request by razorpay order ID
            from sqlalchemy import text
            from core.db_utils import get_db_connection
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Find renewal by order ID and update payment status
            query = text("""
                UPDATE renewal_requests 
                SET razorpay_payment_id = :payment_id, status = 'paid', updated_at = CURRENT_TIMESTAMP
                WHERE razorpay_order_id = :order_id
                RETURNING id, plan_id, user_id
            """)
            cursor.execute(query, {
                "payment_id": razorpay_payment_id,
                "order_id": razorpay_order_id
            })
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                renewal_id, plan_id, user_id = result
                
                # Activate the renewal plan (extend expiry)
                activation_result = activate_renewal_plan(renewal_id)
                
                # Send confirmation email
                from utils.email_service import send_renewal_confirmation_email
                try:
                    send_renewal_confirmation_email(user_id, activation_result)
                    print(f"✅ Renewal confirmation email sent to user {user_id}")
                except Exception as email_error:
                    print(f"⚠️ Email send failed (non-critical): {email_error}")
                
                print(f"✅ Renewal payment authorized and plan activated - Renewal: {renewal_id}, Order: {razorpay_order_id}")
            else:
                print(f"⚠️ Renewal not found for order {razorpay_order_id}")
            
            cursor.close()
            conn.close()
            return {"status": "ok"}
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"❌ Renewal webhook error: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/custom-pricing/confirm-payment")
def confirm_custom_pricing_payment(payment_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    Customer confirms custom pricing payment
    Payload: {plan_id, razorpay_payment_id}
    Automatically sends payment confirmation email
    """
    try:
        plan_id = payment_data.get("plan_id")
        razorpay_payment_id = payment_data.get("razorpay_payment_id")
        
        if not plan_id or not razorpay_payment_id:
            raise HTTPException(status_code=400, detail="Plan ID and payment ID required")
        
        plan = get_custom_plan_by_id(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Verify user owns this plan
        if plan["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Update payment status and send confirmation email
        result = update_payment_status(plan_id, "paid", razorpay_payment_id, send_email=True)
        
        if result["success"]:
            # TODO: Upgrade user's plan in user_plans table
            # TODO: Update pricing_requests status to 'paid'
            return {
                "success": True,
                "message": "✅ Payment confirmed! Your custom plan is now active. Confirmation email sent."
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error confirming payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")


# --- RENEWAL ENDPOINTS ---

@app.post("/api/plans/{plan_id}/renew")
def create_plan_renewal(plan_id: int, request_body: dict = Body(...), current_user = Depends(get_current_user)):
    """
    Create a renewal request for an existing custom pricing plan
    Payload: {renewal_days: int}
    Returns: Renewal details with Razorpay payment link
    """
    try:
        renewal_days = request_body.get("renewal_days")
        
        if not renewal_days or renewal_days <= 0:
            raise HTTPException(status_code=400, detail="Invalid renewal days")
        
        # Verify user owns this plan
        plan = get_custom_plan_by_id(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        if plan["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Create renewal request
        renewal = create_renewal_request(plan_id, current_user["id"], renewal_days)
        
        return {
            "success": True,
            "renewal": renewal,
            "message": "Renewal request created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating renewal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/renewals/my")
def get_user_renewals(current_user = Depends(get_current_user)):
    """
    Get all renewal requests for current user
    Returns: List of renewal requests with status
    """
    try:
        renewals = get_renewal_requests_by_user(current_user["id"])
        return {
            "success": True,
            "renewals": renewals,
            "count": len(renewals)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching renewals: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch renewals")


@app.get("/api/renewals/{renewal_id}")
def get_renewal_details(renewal_id: int, current_user = Depends(get_current_user)):
    """
    Get renewal request details
    Verifies user ownership
    """
    try:
        from sqlalchemy import text
        from core.db_utils import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = text("""
            SELECT id, plan_id, renewal_days, pro_rated_price, status, 
                   razorpay_order_id, payment_link, created_at, updated_at
            FROM renewal_requests 
            WHERE id = :renewal_id AND user_id = :user_id
        """)
        cursor.execute(query, {"renewal_id": renewal_id, "user_id": current_user["id"]})
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Renewal request not found")
        
        return {
            "success": True,
            "renewal": {
                "renewal_id": result[0],
                "plan_id": result[1],
                "renewal_days": result[2],
                "pro_rated_price": float(result[3]),
                "status": result[4],
                "razorpay_order_id": result[5],
                "payment_link": result[6],
                "created_at": result[7],
                "updated_at": result[8]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching renewal details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch renewal details")


@app.get("/api/renewals/{renewal_id}/payment-status")
def check_renewal_payment_status(renewal_id: int, current_user = Depends(get_current_user)):
    """
    Check renewal payment status
    """
    try:
        from sqlalchemy import text
        from core.db_utils import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = text("""
            SELECT status, razorpay_payment_id FROM renewal_requests 
            WHERE id = :renewal_id AND user_id = :user_id
        """)
        cursor.execute(query, {"renewal_id": renewal_id, "user_id": current_user["id"]})
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Renewal not found")
        
        status_val, payment_id = result
        
        return {
            "success": True,
            "renewal_id": renewal_id,
            "status": status_val,
            "payment_id": payment_id,
            "is_paid": status_val == "paid"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error checking payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")


@app.post("/api/renewals/{renewal_id}/confirm-payment")
def confirm_renewal_payment(renewal_id: int, payment_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    Confirm renewal payment after Razorpay transaction
    Payload: {razorpay_payment_id}
    """
    try:
        razorpay_payment_id = payment_data.get("razorpay_payment_id")
        
        if not razorpay_payment_id:
            raise HTTPException(status_code=400, detail="Payment ID required")
        
        # Verify user ownership
        from sqlalchemy import text
        from core.db_utils import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = text("""
            SELECT user_id FROM renewal_requests WHERE id = :renewal_id
        """)
        cursor.execute(query, {"renewal_id": renewal_id})
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result or result[0] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Update payment status
        renewal_data = update_renewal_payment_status(renewal_id, razorpay_payment_id, "paid")
        
        # Activate renewal plan
        activation_data = activate_renewal_plan(renewal_id)
        
        return {
            "success": True,
            "message": "✅ Renewal payment confirmed! Your plan has been renewed.",
            "renewal": renewal_data,
            "plan_expires_at": activation_data["new_expiry"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error confirming renewal payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/renewals/{renewal_id}/cancel")
def cancel_renewal(renewal_id: int, current_user = Depends(get_current_user)):
    """
    Cancel a pending renewal request
    Can only cancel renewals with 'pending' status
    """
    try:
        result = cancel_renewal_request(renewal_id, current_user["id"])
        
        return {
            "success": True,
            "message": "Renewal request cancelled",
            "renewal": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error cancelling renewal: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel renewal")


