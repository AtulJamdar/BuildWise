import os
import json
from fastapi import FastAPI, Body, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

# Import your local services
from core.project_service import get_user_projects, get_project_scans
from core.issue_service import get_scan_issues, get_issue_by_id, update_issue_status
from core.user_service import login_user, register_user, generate_reset_token, reset_password
from utils.dependencies import get_current_user

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
    projects = get_user_projects(user_id) 

    result = []
    for p in projects:
        result.append({
            "id": p[0],
            "name": p[1],
            "total_scans": p[2]
        })

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
    return {
        "id": issue[0], "file": issue[1], "line": issue[2], "type": issue[3],
        "severity": issue[4], "title": issue[5], "why": issue[6], 
        "fix": issue[7], "status": issue[8]
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
    project_name = data.get("project_name", "Unknown")
    issues = data.get("issues", [])
    if not issues: 
        return {"suggestions": []}
    
    issues_summary = "\n".join([f"- {i['severity']}: {i['title']}" for i in issues[:15]])
    prompt = f"Analyze findings for '{project_name}':\n{issues_summary}\nReturn 3 suggestions as JSON array."

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        ai_content = completion.choices[0].message.content.strip()
        return {"suggestions": json.loads(ai_content)}
    except Exception as e:
        print(f"AI Error: {e}")
        return {"suggestions": ["Review high severity issues.", "Modularize code.", "Check dependency safety."]}
    

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