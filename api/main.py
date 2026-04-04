from fastapi import FastAPI
from core.project_service import get_user_projects
from utils.session import get_logged_in_user
from core.project_service import get_project_scans
from core.issue_service import get_scan_issues
from core.issue_service import get_issue_by_id
from core.issue_service import update_issue_status

app = FastAPI()


@app.get("/")
def home():
    return {"message": "BuildWise API running"}

@app.get("/projects")
def get_projects():
    projects = get_user_projects()

    result = []

    for p in projects:
        result.append({
            "id": p[0],
            "name": p[1],
            "total_scans": p[2]
        })

    return result

@app.get("/projects/{project_id}/scans")
def get_scans(project_id: int):
    scans = get_project_scans(project_id)

    result = []

    for s in scans:
        result.append({
            "id": s[0],
            "score": s[1],
            "created_at": str(s[2])
        })

    return result

@app.get("/scans/{scan_id}/issues")
def get_issues(scan_id: int):
    issues = get_scan_issues(scan_id)

    result = []

    for i in issues:
        result.append({
            "id": i[0],
            "file": i[1],
            "severity": i[2],
            "title": i[3],
            "status": i[4]
        })

    return result

@app.get("/issues/{issue_id}")
def get_issue(issue_id: int):
    issue = get_issue_by_id(issue_id)

    if not issue:
        return {"error": "Issue not found"}

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


from fastapi import Body

@app.put("/issues/{issue_id}")
def update_issue(issue_id: int, data: dict = Body(...)):
    status = data.get("status")

    if status not in ["OPEN", "FIXED", "IGNORED"]:
        return {"error": "Invalid status"}

    update_issue_status(issue_id, status)

    return {"message": f"Issue {issue_id} updated to {status}"}