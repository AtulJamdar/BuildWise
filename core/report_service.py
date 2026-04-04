import json
from db.connection import get_connection
from utils.session import get_logged_in_user
from core.project_service import get_or_create_project

def save_report(project_name, score, summary, issues, repo_url=None):
    conn = get_connection()
    cur = conn.cursor()

    # 🔥 Get project_id
    project_id = get_or_create_project(project_name, repo_url)

    # Insert report
    cur.execute(
        "INSERT INTO reports (project_id, score, summary) VALUES (%s, %s, %s) RETURNING id",
        (project_id, score, json.dumps(summary))
    )

    scan_id = cur.fetchone()[0]

    # Insert issues
    for issue in issues:
        cur.execute(
            """
            INSERT INTO issues (scan_id, file, line, type, severity, title, why, fix)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                scan_id,
                issue["file"],
                issue["line"],
                issue["type"],
                issue["severity"],
                issue["title"],
                issue["why"],
                issue["fix"]
            )
        )

    conn.commit()
    cur.close()
    conn.close()

    print("✅ Report saved under project")