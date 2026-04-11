import base64
import os
import json
from fastapi import FastAPI, Body, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv
from db.connection import get_connection
from core.project_service import get_or_create_project, get_user_projects, get_project_scans, verify_project_access, verify_issue_access, verify_scan_access

# Import your local services
from core.issue_service import get_scan_issues, get_issue_by_id, update_issue_status
from core.scanner import scan_project
from core.user_service import login_user, register_user, generate_reset_token, reset_password, get_user_plan_info, increment_scan_count
from core.team_service import create_team, get_user_teams, add_member_to_team, user_is_team_member, get_team_by_id, get_team_projects as get_team_projects_for_team
from utils.dependencies import get_current_user
from utils.token import generate_invite_token
from utils.email_service import send_invite_email, send_password_reset_email
from core.repo_scanner import scan_github_repo
import requests
import razorpay
import hmac
import hashlib
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone

load_dotenv()
config = Config(environ=os.environ)

def get_env(key, default=None):
    value = os.getenv(key, default)
    return value.strip() if isinstance(value, str) else value

client = Groq(api_key=get_env("GROQ_API_KEY"))
RAZORPAY_KEY_ID = get_env("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = get_env("RAZORPAY_KEY_SECRET")
GOOGLE_CLIENT_ID = get_env("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = get_env("GOOGLE_CLIENT_SECRET")
SECRET_KEY = get_env("SECRET_KEY", "supersecret")

# Patch requests auth to support UTF-8 credentials if needed.
import requests.auth

def _basic_auth_str_utf8(username, password):
    username_bytes = username.encode("utf-8") if isinstance(username, str) else username
    password_bytes = password.encode("utf-8") if isinstance(password, str) else password
    user_pass = base64.b64encode(username_bytes + b":" + password_bytes).decode("latin1")
    return "Basic %s" % user_pass

requests.auth._basic_auth_str = _basic_auth_str_utf8

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
BACKEND_URL = get_env("BACKEND_URL", "http://localhost:8000")
GOOGLE_REDIRECT_URI = get_env("GOOGLE_REDIRECT_URI", f"{BACKEND_URL}/auth/google/callback")
FRONTEND_URL = get_env("FRONTEND_URL", "http://localhost:5173")

oauth = OAuth(config)
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

app = FastAPI(title="BuildWise API")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

@app.on_event("startup")
def ensure_tables_exist():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS invitations (
                id SERIAL PRIMARY KEY,
                team_id INT NOT NULL,
                email TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                status TEXT DEFAULT 'pending'
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()

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
    return [{"id": i[0], "file": i[1], "severity": i[2], "title": i[3], "status": i[4]} for i in issues]

@app.get("/issues/{issue_id}")
def get_issue(issue_id: int, user_id: int = Depends(get_current_user)):
    if not verify_issue_access(issue_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this issue")
    issue = get_issue_by_id(issue_id)
    if not issue: 
        raise HTTPException(status_code=404, detail="Issue not found")
    print(f"📝 Fetching issue {issue_id}: File={issue[1]}, Line={issue[2]}, Title={issue[5]}")
    return {
        "id": issue[0], 
        "file": issue[1], 
        "line": issue[2], 
        "type": issue[3],
        "severity": issue[4], 
        "title": issue[5], 
        "why": issue[6], 
        "fix": issue[7], 
        "status": issue[8]
    }

@app.put("/issues/{issue_id}")
def update_issue(issue_id: int, data: dict = Body(...), user_id: int = Depends(get_current_user)):
    if not verify_issue_access(issue_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this issue")
    status_val = data.get("status")
    if status_val not in ["OPEN", "FIXED", "IGNORED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    update_issue_status(issue_id, status_val)
    return {"message": "Updated"}

# --- 🧠 AI SUGGESTIONS ---

@app.post("/ai/suggestions")
async def get_ai_suggestions(data: dict = Body(...), user_id: int = Depends(get_current_user)):
    from db.connection import get_connection
    import json

    # --- 🧠 Step 1: Fetch Personalization Data ---
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT role_type, experience_level, tech_stack, plan, trial_ends FROM users WHERE id=%s",
            (user_id,)
        )
        user_row = cur.fetchone()

        if user_row:
            role_type, experience_level, tech_stack, plan, trial_ends = user_row
        else:
            role_type, experience_level, tech_stack, plan, trial_ends = (
                "developer", "intermediate", "Fullstack", "free", None
            )
    finally:
        cur.close()
        conn.close()

    language = data.get("language", "en")
    language_names = {"en": "English", "hi": "Hindi", "mr": "Marathi"}
    language_name = language_names.get(language, "English")

    # Basic AI experience for free users outside trial window
    trial_active = False
    if trial_ends:
        if isinstance(trial_ends, str):
            trial_ends = datetime.fromisoformat(trial_ends)
        trial_active = datetime.now(timezone.utc) < trial_ends

    project_name = data.get("project_name", "Unknown Project")
    issues = data.get("issues", [])

    if plan == "free" and not trial_active:
        if not issues:
            no_issue_text = {
                "en": "No issues found yet. Start a scan to get AI insights!",
                "hi": "अभी तक कोई मुद्दे नहीं मिले। AI इनसाइट्स के लिए अपना प्रोजेक्ट स्कैन करें!",
                "mr": "अजून कोणतीही समस्या आढळली नाही. AI इनसाइटसाठी तुमचा प्रोजेक्ट स्कॅन करा!",
            }
            return {"suggestions": [no_issue_text.get(language, no_issue_text["en"])]}

        severity_map = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        sorted_issues = sorted(
            issues,
            key=lambda item: severity_map.get((item.get("severity") or "").upper(), 0),
            reverse=True,
        )
        top_issue = sorted_issues[0]
        total_issues = len(sorted_issues)

        templates = {
            "en": {
                "fix_top_issue": "Start by fixing the most critical issue: {title}.",
                "review_issues": "Review all {count} issue(s) and prioritize HIGH and MEDIUM severity items.",
                "rerun_scan": "Once fixed, rerun the scan to receive improved recommendations.",
            },
            "hi": {
                "fix_top_issue": "सबसे महत्वपूर्ण मुद्दे को पहले ठीक करें: {title}.",
                "review_issues": "सभी {count} मुद्दों की समीक्षा करें और HIGH तथा MEDIUM गंभीरता वाले आइटम पहले ठीक करें.",
                "rerun_scan": "एक बार ठीक करने के बाद, बेहतर सिफारिशों के लिए स्कैन पुनः चलाएँ.",
            },
            "mr": {
                "fix_top_issue": "सर्वात गंभीर समस्येची दुरुस्ती प्रथम करा: {title}.",
                "review_issues": "सर्व {count} समस्या तपासा आणि HIGH आणि MEDIUM गंभीरतेच्या आयटमांना प्राधान्य द्या.",
                "rerun_scan": "एकदा दुरुस्त केल्यावर, सुधारित शिफारसींसाठी पुन्हा स्कॅन चालवा.",
            },
        }

        template = templates.get(language, templates["en"])
        return {
            "suggestions": [
                template["fix_top_issue"].format(title=top_issue.get("title", "your top issue")),
                template["review_issues"].format(count=total_issues),
                template["rerun_scan"],
            ]
        }

    # --- 🧠 Step 2: Extract Project Data ---
    if not issues: 
        return {"suggestions": [
            {
                "en": "No issues found yet. Start a scan to get AI insights!",
                "hi": "अभी तक कोई मुद्दे नहीं मिले। AI इनसाइट्स के लिए अपना प्रोजेक्ट स्कैन करें!",
                "mr": "अजून कोणतीही समस्या आढळली नाही. AI इनसाइटसाठी तुमचा प्रोजेक्ट स्कॅन करा!",
            }.get(language, "No issues found yet. Start a scan to get AI insights!")
        ]}
    
    # Create a compact summary of issues for the AI
    issues_summary = "\n".join([f"- {i['severity']}: {i['title']}" for i in issues[:10]])

    # --- 🧠 Step 3: The Personalized Prompt ---
    prompt = f"""
    You are a senior software architect and mentor. Provide 5 practical suggestions for this project.

    LANGUAGE: Respond in {language_name}.

    USER CONTEXT:
    - Role: {role_type}
    - Experience: {experience_level}
    - Tech Stack: {tech_stack}

    PROJECT: {project_name}

    SECURITY ISSUES FOUND:
    {issues_summary}

    PERSONALIZATION RULES:
    1. If user is a STUDENT: Explain concepts simply, suggest learning resources, and recommend beginner-friendly features.
    2. If user is a PROFESSIONAL: Focus on architecture, scalability, and high-performance optimization.

    OUTPUT FORMAT:
    Return ONLY a raw JSON array of strings. No introductory text. 
    Example: ["Suggestion 1", "Suggestion 2", "Suggestion 3", "Suggestion 4", "Suggestion 5"]
    """

    # --- 🧠 Step 4: Call AI Model ---
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4, # Slightly higher for better creative suggestions
        )
        
        ai_content = completion.choices[0].message.content.strip()
        
        # Parse the AI string into a clean Python list
        suggestions_list = json.loads(ai_content)
        return {"suggestions": suggestions_list}

    except Exception as e:
        print(f"🔥 AI/JSON Error: {e}")
        # Robust fallback suggestions based on the user's role
        if role_type == "student":
            return {"suggestions": [
                "Research the OWASP Top 10 to understand these vulnerabilities better.",
                "Try fixing one High severity issue and verify it with a re-scan.",
                "Use environment variables (.env) to hide your API keys."
            ]}
        else:
            return {"suggestions": [
                "Implement a stricter Content Security Policy (CSP).",
                "Review the project architecture for potential bottlenecking.",
                "Optimize database queries related to the flagged files."
            ]}
    

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
    gh_token = data.get("gh_token")
    team_id = data.get("team_id")

    if not repo_url:
        raise HTTPException(status_code=400, detail="Repository URL is required")

    plan_info = get_user_plan_info(user_id)
    if not plan_info:
        raise HTTPException(status_code=404, detail="User plan not found")

    trial_active = False
    if plan_info.get("trial_ends"):
        trial_ends = plan_info["trial_ends"]
        if isinstance(trial_ends, str):
            trial_ends = datetime.fromisoformat(trial_ends)
        trial_active = datetime.now(timezone.utc) < trial_ends

    if plan_info["plan"] != "team" and not trial_active:
        if plan_info["scan_count"] >= plan_info["scan_limit"]:
            raise HTTPException(status_code=403, detail="Scan limit reached. Upgrade your plan.")

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

        if result.get("status") == "success":
            increment_scan_count(user_id)

        print(f"✅ Scan completed successfully: {result}")
        return {"message": "Scan completed successfully", "details": result}
        
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
    cur.execute(
        "UPDATE users SET plan=%s, scan_limit=%s WHERE id=%s",
        ("pro", 100, user_id)
    )
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Payment successful, plan upgraded"}


# --- 🐙 GITHUB OAUTH ENDPOINTS ---

@app.get("/auth/google")
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth configuration missing")
    redirect_uri = GOOGLE_REDIRECT_URI
    print(f"🔁 Google login redirect_uri: {redirect_uri}")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google/callback")
async def google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user = token.get("userinfo")

    if not user:
        try:
            user = await oauth.google.parse_id_token(request, token)
        except Exception as parse_err:
            print(f"❌ Google ID token parse failed: {parse_err}")
            raise HTTPException(status_code=400, detail="Unable to parse Google user info")

    email = user.get("email")
    name = user.get("name") or user.get("email") or "Google User"

    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email")

    try:
        register_user(name, email, "google_user")
    except Exception:
        pass

    auth_data = login_user(email, "google_user")
    if auth_data and "access_token" in auth_data:
        app_token = auth_data.get("access_token")
    else:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=auth_failed")

    return RedirectResponse(url=f"{FRONTEND_URL}/oauth-success?token={app_token}")


@app.get("/auth/github")
def github_login():
    client_id = os.getenv("GITHUB_CLIENT_ID")
    # Request access to repo scope so private repositories can be listed and cloned
    url = f"https://github.com/login/oauth/authorize?client_id={client_id}&scope=repo%20user:email"
    return {"url": url}

@app.get("/auth/github/callback")
def github_callback(code: str):
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")

    # 1. Exchange code for GitHub Access Token
    token_res = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
        },
    )
    access_token = token_res.json().get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to retrieve access token from GitHub")

    # 2. Get User Info from GitHub API
    user_res = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {access_token}"}
    )
    user_data = user_res.json()

    # Handle cases where email might be private
    email = user_data.get("email") or f"{user_data.get('login')}@github.com"
    name = user_data.get("name") or user_data.get("login")

    # 3. Register or Login the user in our DB
    # We wrap registration in a try/except to ignore "User already exists" errors
    try:
        register_user(name, email, "github_oauth_dummy_pass")
    except Exception as e:
        print(f"User check: {name} is already in the database.")

    # 4. Generate our BUILDWISE app JWT token
    auth_data = login_user(email, "github_oauth_dummy_pass")
    
    if auth_data and "access_token" in auth_data:
        app_token = auth_data.get("access_token")
    else:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=auth_failed")

    return RedirectResponse(
        url=f"{FRONTEND_URL}/oauth-success?token={app_token}&gh_token={access_token}"
    )

@app.get("/github/repos")
def get_github_repos(token: str):
    """
    Fetches the list of repositories for the authenticated GitHub user.
    """
    # Note: 'token' here is the GITHUB access token, not our app JWT
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