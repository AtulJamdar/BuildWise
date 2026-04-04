from db.connection import get_connection

def update_issue_status(issue_id, new_status):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "UPDATE issues SET status=%s WHERE id=%s",
        (new_status, issue_id)
    )

    if cur.rowcount == 0:
        print("❌ Issue not found")
    else:
        print(f"✅ Issue {issue_id} updated to {new_status}")

    conn.commit()
    cur.close()
    conn.close()


def get_scan_issues(scan_id):
    from db.connection import get_connection

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, file, severity, title, status
        FROM issues
        WHERE scan_id = %s
        ORDER BY id DESC
        """,
        (scan_id,)
    )

    issues = cur.fetchall()

    cur.close()
    conn.close()

    return issues

def get_issue_by_id(issue_id):
    from db.connection import get_connection

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, file, line, type, severity, title, why, fix, status
        FROM issues
        WHERE id = %s
        """,
        (issue_id,)
    )

    issue = cur.fetchone()

    cur.close()
    conn.close()

    return issue