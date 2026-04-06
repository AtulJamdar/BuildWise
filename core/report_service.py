import json
from db.connection import get_connection

def save_report(project_name, score, summary, results, user_id, repo_url=None):
    """
    Saves a security scan report and its issues to the database.
    Links the project to a specific user_id for security.
    """
    print(f"💾 Saving report for project: {project_name}, user_id: {user_id}, score: {score}")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # 1. Get or Create Project ID for this specific user
        print(f"🔍 Checking if project exists for user {user_id}")
        cur.execute(
            "SELECT id FROM projects WHERE project_name = %s AND user_id = %s",
            (project_name, user_id)
        )
        project = cur.fetchone()
        
        if project:
            project_id = project[0]
            print(f"✅ Found existing project_id: {project_id}")
        else:
            print(f"🆕 Creating new project for user {user_id}")
            # Create new project if it doesn't exist for this user
            cur.execute(
                "INSERT INTO projects (project_name, user_id, repo_url) VALUES (%s, %s, %s) RETURNING id",
                (project_name, user_id, repo_url)
            )
            project_id = cur.fetchone()[0]
            print(f"✅ Created new project_id: {project_id}")

        # 2. Insert the Scan result (into reports/scans table)
        # Note: Using your 'reports' table name from the original file
        print(f"📝 Inserting scan report with score {score}")
        cur.execute(
            "INSERT INTO reports (project_id, score, summary) VALUES (%s, %s, %s) RETURNING id",
            (project_id, score, json.dumps(summary))
        )
        scan_id = cur.fetchone()[0]
        print(f"✅ Scan inserted with scan_id: {scan_id}")

        # 3. Insert each Issue with full details
        print(f"📋 Inserting {len(results)} issues")
        for issue in results:
            cur.execute(
                """
                INSERT INTO issues (scan_id, file, line, type, severity, title, why, fix, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    scan_id,
                    issue.get("file"),
                    issue.get("line"),
                    issue.get("type"),
                    issue.get("severity"),
                    issue.get("title"),
                    issue.get("why"),
                    issue.get("fix"),
                    "OPEN" # Default status
                )
            )
            
        conn.commit()
        print(f"✅ Report saved successfully for project: {project_name}, scan_id: {scan_id}")
        return scan_id

    except Exception as e:
        conn.rollback()
        print(f"❌ Failed to save report: {e}")
        raise e
    finally:
        cur.close()
        conn.close()