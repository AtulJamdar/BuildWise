import os
import json
from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

# Import your local services
from core.project_service import get_user_projects, get_project_scans
from core.issue_service import get_scan_issues, get_issue_by_id, update_issue_status

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize Groq Client
client = Groq(api_key=GROQ_API_KEY)

app = FastAPI(title="BuildWise API")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "BuildWise API is online"}

# --- PROJECT ENDPOINTS ---

@app.get("/projects")
def get_projects():
    projects = get_user_projects()
    return [{"id": p[0], "name": p[1], "total_scans": p[2]} for p in projects]

@app.get("/projects/{project_id}/scans")
def get_scans(project_id: int):
    scans = get_project_scans(project_id)
    return [{"id": s[0], "score": s[1], "created_at": str(s[2])} for s in scans]

# --- ISSUE ENDPOINTS ---

@app.get("/scans/{scan_id}/issues")
def get_issues(scan_id: int):
    issues = get_scan_issues(scan_id)
    return [
        {"id": i[0], "file": i[1], "severity": i[2], "title": i[3], "status": i[4]} 
        for i in issues
    ]

@app.get("/issues/{issue_id}")
def get_issue(issue_id: int):
    issue = get_issue_by_id(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    return {
        "id": issue[0], "file": issue[1], "line": issue[2], "type": issue[3],
        "severity": issue[4], "title": issue[5], "why": issue[6], 
        "fix": issue[7], "status": issue[8]
    }

@app.put("/issues/{issue_id}")
def update_issue(issue_id: int, data: dict = Body(...)):
    status = data.get("status")
    if status not in ["OPEN", "FIXED", "IGNORED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_issue_status(issue_id, status)
    return {"message": f"Issue {issue_id} updated to {status}"}

# --- 🧠 AI SUGGESTIONS ENDPOINT (The Groq Integration) ---

@app.post("/ai/suggestions")
async def get_ai_suggestions(data: dict = Body(...)):
    project_name = data.get("project_name", "Unknown Project")
    issues = data.get("issues", [])

    if not issues:
        return {"project": project_name, "suggestions": ["No issues detected to analyze."]}

    # Prepare a condensed summary for the AI to keep it focused
    issues_summary = "\n".join([f"- {i['severity']}: {i['title']}" for i in issues[:15]])

    prompt = f"""
    You are a Senior Software Architect and Security Expert.
    Analyze the following security/structure findings for the project '{project_name}':
    
    FINDINGS:
    {issues_summary}

    TASK:
    Based on these specific findings, provide 3 actionable, high-level architectural suggestions.
    Focus on project health and scalability.
    Return the response as a JSON array of strings ONLY.
    Example: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a concise software architect. Output only raw JSON lists."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )

        # Parse the AI response
        ai_content = completion.choices[0].message.content.strip()
        suggestions = json.loads(ai_content)
        
        return {"project": project_name, "suggestions": suggestions}

    except Exception as e:
        print(f"AI Suggestion Error: {e}")
        # Return fallback suggestions if AI is down
        return {
            "project": project_name,
            "suggestions": [
                "Address high-severity naming and structure issues first.",
                "Implement a consistent documentation standard across all modules.",
                "Consider modularizing large files to improve maintainability."
            ]
        }