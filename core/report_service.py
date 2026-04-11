import json
import hashlib
from db.connection import get_connection
from core.issue_service import log_issue_activity


def _generate_fingerprint(issue):
    if issue.get("fingerprint"):
        return issue.get("fingerprint")

    file_name = issue.get("file", "unknown")
    line = issue.get("line") or 0
    code = issue.get("code") or issue.get("title") or issue.get("type") or ""
    raw = f"{file_name}:{line}:{code}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def save_report(project_name, score, summary, results, user_id, repo_url=None, team_id=None, repo_branch=None, commit_sha=None):
    """
    Saves a security scan report and its issues to the database.
    Links the project to a specific user_id and optionally to a team.
    """
    print(f"💾 Saving report for project: {project_name}, user_id: {user_id}, team_id: {team_id}, score: {score}")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        if team_id:
            cur.execute(
                "SELECT id FROM projects WHERE project_name = %s AND team_id = %s",
                (project_name, team_id)
            )
        else:
            cur.execute(
                "SELECT id FROM projects WHERE project_name = %s AND user_id = %s",
                (project_name, user_id)
            )
        project = cur.fetchone()
        
        if project:
            project_id = project[0]
            print(f"✅ Found existing project_id: {project_id}")
        else:
            print(f"🆕 Creating new project for user {user_id} team {team_id}")
            cur.execute(
                "INSERT INTO projects (project_name, user_id, repo_url, team_id) VALUES (%s, %s, %s, %s) RETURNING id",
                (project_name, user_id, repo_url, team_id)
            )
            project_id = cur.fetchone()[0]
            print(f"✅ Created new project_id: {project_id}")

        print(f"📝 Inserting scan report with score {score}")
        cur.execute(
            "INSERT INTO reports (project_id, score, summary, commit_sha, branch) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (project_id, score, json.dumps(summary), commit_sha, repo_branch)
        )
        scan_id = cur.fetchone()[0]
        print(f"✅ Scan inserted with scan_id: {scan_id}")

        print(f"📋 Inserting {len(results)} issues")
        for issue in results:
            fingerprint = _generate_fingerprint(issue)
            cur.execute(
                "SELECT id, status FROM issues WHERE project_id = %s AND fingerprint = %s",
                (project_id, fingerprint)
            )
            existing = cur.fetchone()

            if existing:
                issue_id, existing_status = existing
                note = None
                updated_status = existing_status or "OPEN"

                if existing_status == "IGNORED":
                    note = "previously_ignored"
                    updated_status = "IGNORED"
                elif existing_status == "FIXED":
                    note = "reopened"
                    updated_status = "OPEN"

                cur.execute(
                    """
                    UPDATE issues
                    SET scan_id=%s,
                        file=%s,
                        line=%s,
                        code=%s,
                        type=%s,
                        severity=%s,
                        title=%s,
                        why=%s,
                        fix=%s,
                        status=%s,
                        note=%s,
                        context_before=%s,
                        context_after=%s,
                        repo_path=%s,
                        updated_at=NOW(),
                        last_seen_at=NOW()
                    WHERE id=%s
                    """,
                    (
                        scan_id,
                        issue.get("file"),
                        issue.get("line"),
                        issue.get("code"),
                        issue.get("type"),
                        issue.get("severity"),
                        issue.get("title"),
                        issue.get("why"),
                        issue.get("fix"),
                        updated_status,
                        note,
                        json.dumps(issue.get("context_before")) if issue.get("context_before") is not None else None,
                        json.dumps(issue.get("context_after")) if issue.get("context_after") is not None else None,
                        issue.get("repo_path"),
                        issue_id,
                    )
                )

                issue["id"] = issue_id
                issue["status"] = updated_status
                issue["note"] = note
                log_issue_activity(issue_id, f"scan_reappeared:{note or 'seen_again'}", user_id)
            else:
                cur.execute(
                    """
                    INSERT INTO issues (project_id, scan_id, fingerprint, file, line, code, type, severity, title, why, fix, status, note, context_before, context_after, repo_path, created_at, updated_at, last_seen_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), NOW())
                    RETURNING id
                    """,
                    (
                        project_id,
                        scan_id,
                        fingerprint,
                        issue.get("file"),
                        issue.get("line"),
                        issue.get("code"),
                        issue.get("type"),
                        issue.get("severity"),
                        issue.get("title"),
                        issue.get("why"),
                        issue.get("fix"),
                        "OPEN",
                        None,
                        json.dumps(issue.get("context_before")) if issue.get("context_before") is not None else None,
                        json.dumps(issue.get("context_after")) if issue.get("context_after") is not None else None,
                        issue.get("repo_path"),
                    )
                )
                issue_id = cur.fetchone()[0]
                issue["id"] = issue_id
                issue["status"] = "OPEN"
                issue["note"] = None
                log_issue_activity(issue_id, "created", user_id)

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