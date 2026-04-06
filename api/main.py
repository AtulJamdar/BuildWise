import os
import json
from fastapi import FastAPI, Body, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv
from core.project_service import get_or_create_project

# Import your local services
from core.project_service import get_user_projects, get_project_scans
from core.issue_service import get_scan_issues, get_issue_by_id, update_issue_status
from core.scanner import scan_project
from core.user_service import login_user, register_user, generate_reset_token, reset_password
from utils.dependencies import get_current_user
from core.repo_scanner import scan_github_repo

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI(title="BuildWise API")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    result = register_user(name, email, password)
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
    print(f"Reset token generated: {token}")
    return {"message": "Reset link sent"}

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
        # Count scans for this project
        cur.execute("SELECT COUNT(*) FROM reports WHERE project_id = %s", (project_id,))
        scan_count = cur.fetchone()[0]
        print(f"📊 Project {p[1]} (id: {project_id}) has {scan_count} scans")
        
        result.append({
            "id": p[0],
            "name": p[1],
            "total_scans": scan_count
        })
    
    conn.close()
    return result

@app.get("/projects/{project_id}/scans")
def get_scans(project_id: int, user_id: int = Depends(get_current_user)):
    scans = get_project_scans(project_id)
    return [{"id": s[0], "score": s[1], "created_at": str(s[2])} for s in scans]

# --- 🛠️ ISSUES ---

@app.get("/scans/{scan_id}/issues")
def get_issues(scan_id: int, user_id: int = Depends(get_current_user)):
    issues = get_scan_issues(scan_id)
    return [{"id": i[0], "file": i[1], "severity": i[2], "title": i[3], "status": i[4]} for i in issues]

@app.get("/issues/{issue_id}")
def get_issue(issue_id: int, user_id: int = Depends(get_current_user)):
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
            "SELECT role_type, experience_level, tech_stack FROM users WHERE id=%s",
            (user_id,)
        )
        user_row = cur.fetchone()
        
        # Fallback if profile is somehow missing
        role_type, experience_level, tech_stack = user_row if user_row else ("developer", "intermediate", "Fullstack")
    finally:
        cur.close()
        conn.close()

    # --- 🧠 Step 2: Extract Project Data ---
    project_name = data.get("project_name", "Unknown Project")
    issues = data.get("issues", [])
    
    if not issues: 
        return {"suggestions": ["No issues found yet. Start a scan to get AI insights!"]}
    
    # Create a compact summary of issues for the AI
    issues_summary = "\n".join([f"- {i['severity']}: {i['title']}" for i in issues[:10]])

    # --- 🧠 Step 3: The Personalized Prompt ---
    prompt = f"""
    You are a senior software architect and mentor. Provide 5 practical suggestions for this project.

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
            SELECT username, email, role_type, experience_level, tech_stack
            FROM users
            WHERE id=%s
            """,
            (user_id,)
        )

        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        print(f"✅ Profile retrieved: {user[0]}")
        
        return {
            "name": user[0],
            "email": user[1],
            "role_type": user[2],
            "experience_level": user[3],
            "tech_stack": user[4]
        }
    except Exception as e:
        print(f"❌ Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


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
    
    if not repo_url:
        raise HTTPException(status_code=400, detail="Repository URL is required")

    print(f"🔍 Scan request received for repo_url: {repo_url}, user_id: {user_id}")

    try:
        # 🌐 If it's a GitHub link, use the cloning logic
        if "github.com" in repo_url:
            print(f"🌍 Detected GitHub URL. Cloning and Scanning...")
            # Note: We need to update this function to accept user_id
            result = scan_github_repo(repo_url, user_id) 
        else:
            # 📂 Otherwise, treat as local path
            from core.scanner import scan_project
            project_name = repo_url.split("/")[-1]
            result = scan_project(repo_url, project_name, user_id, repo_url)

        print(f"✅ Scan completed successfully: {result}")
        return {"message": "Scan completed successfully", "details": result}
        
    except Exception as e:
        print(f"❌ Scan Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))