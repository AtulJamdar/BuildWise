import json
from db.connection import get_connection
from core.db_utils import execute_query, execute_update, verify_access


def log_issue_activity(issue_id, action, user_id=None, details=None):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO issue_activity (issue_id, action, user_id, details) VALUES (%s, %s, %s, %s)",
            (issue_id, action, user_id, details)
        )
        conn.commit()
    except Exception as e:
        print(f"❌ Failed to log issue activity: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def update_issue_status(issue_id, new_status, user_id=None):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "UPDATE issues SET status=%s, updated_by=%s, updated_at=NOW() WHERE id=%s",
        (new_status, user_id, issue_id)
    )

    if cur.rowcount == 0:
        print("❌ Issue not found")
        conn.rollback()
    else:
        print(f"✅ Issue {issue_id} updated to {new_status}")
        log_issue_activity(issue_id, f"status_updated:{new_status}", user_id)
        conn.commit()

    cur.close()
    conn.close()


def assign_issue(issue_id, assignee_id, user_id=None):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "UPDATE issues SET assigned_to=%s, updated_by=%s, updated_at=NOW() WHERE id=%s",
        (assignee_id, user_id, issue_id)
    )

    if cur.rowcount == 0:
        print("❌ Issue not found for assignment")
        conn.rollback()
    else:
        print(f"✅ Issue {issue_id} assigned to user {assignee_id}")
        log_issue_activity(issue_id, f"assigned_to:{assignee_id}", user_id)
        conn.commit()

    cur.close()
    conn.close()


def get_scan_issues(scan_id):
    """Fetch all issues for a scan."""
    return execute_query(
        """
        SELECT id, file, severity, title, status, note, assigned_to
        FROM issues
        WHERE scan_id = %s
        ORDER BY id DESC
        """,
        (scan_id,)
    )


def get_issue_activity(issue_id):
    """Fetch activity log for an issue."""
    return execute_query(
        """
        SELECT ia.action, ia.details, ia.created_at, u.username
        FROM issue_activity ia
        LEFT JOIN users u ON ia.user_id = u.id
        WHERE ia.issue_id = %s
        ORDER BY ia.created_at DESC
        """,
        (issue_id,)
    )


def get_issue_repo_info(issue_id):
    """Fetch repository information for an issue."""
    return execute_query(
        """
        SELECT
            p.repo_url,
            r.commit_sha,
            r.branch,
            i.repo_path
        FROM issues i
        JOIN reports r ON r.id = i.scan_id
        JOIN projects p ON p.id = r.project_id
        WHERE i.id = %s
        """,
        (issue_id,),
        fetch_one=True
    )


def get_issue_by_id(issue_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            i.id,
            i.file,
            i.line,
            i.code,
            i.type,
            i.severity,
            i.title,
            i.why,
            i.fix,
            i.status,
            i.note,
            i.assigned_to,
            assigned.username AS assigned_to_name,
            i.updated_by,
            updated.username AS updated_by_name,
            i.fingerprint,
            i.context_before,
            i.context_after,
            i.repo_path
        FROM issues i
        LEFT JOIN users assigned ON assigned.id = i.assigned_to
        LEFT JOIN users updated ON updated.id = i.updated_by
        WHERE i.id = %s
        """,
        (issue_id,)
    )

    issue = cur.fetchone()

    if issue:
        # Convert tuple to dictionary using column names
        return {
            "id": issue[0],
            "file": issue[1],
            "line": issue[2],
            "code": issue[3],
            "type": issue[4],
            "severity": issue[5],
            "title": issue[6],
            "why": issue[7],
            "fix": issue[8],
            "status": issue[9],
            "note": issue[10],
            "assigned_to": issue[11],
            "assigned_to_name": issue[12],
            "updated_by": issue[13],
            "updated_by_name": issue[14],
            "fingerprint": issue[15],
            "context_before": json.loads(issue[16]) if issue[16] else None,
            "context_after": json.loads(issue[17]) if issue[17] else None,
            "repo_path": issue[18]
        }

    cur.close()
    conn.close()

    return None


def find_issue_by_fingerprint(project_id, fingerprint):
    """Find issue by fingerprint to detect duplicates."""
    return execute_query(
        "SELECT id, status, assigned_to FROM issues WHERE project_id = %s AND fingerprint = %s",
        (project_id, fingerprint),
        fetch_one=True
    )