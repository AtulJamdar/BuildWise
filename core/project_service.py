from db.connection import get_connection


def get_or_create_project(name, repo_url, user_id, team_id=None):
    conn = get_connection()
    cur = conn.cursor()
    try:
        if team_id:
            cur.execute(
                "SELECT id FROM projects WHERE project_name = %s AND team_id = %s",
                (name, team_id)
            )
        else:
            cur.execute(
                "SELECT id FROM projects WHERE project_name = %s AND user_id = %s",
                (name, user_id)
            )
        project = cur.fetchone()

        if project:
            return project[0]

        cur.execute(
            "INSERT INTO projects (project_name, repo_url, user_id, team_id) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, repo_url, user_id, team_id)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        return new_id
    finally:
        cur.close()
        conn.close()


def get_user_projects(user_id):
    """
    Fetches projects owned by the user or shared through teams.
    """
    print(f"🔍 Fetching projects for user_id: {user_id}")

    conn = get_connection()
    cur = conn.cursor()

    try:
        query = """
            SELECT DISTINCT p.id, p.project_name, p.team_id, t.name
            FROM projects p
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN team_members tm ON p.team_id = tm.team_id
            WHERE p.user_id = %s OR tm.user_id = %s
        """
        cur.execute(query, (user_id, user_id))
        projects = cur.fetchall()
        print(f"📋 Found {len(projects)} projects: {projects}")
        return projects
    except Exception as e:
        print(f"❌ Database Error in get_user_projects: {e}")
        return []
    finally:
        cur.close()
        conn.close()


def get_project_scans(project_id, user_id=None):
    conn = get_connection()
    cur = conn.cursor()

    if user_id is not None:
        cur.execute(
            """
            SELECT p.id
            FROM projects p
            LEFT JOIN team_members tm ON p.team_id = tm.team_id
            WHERE p.id = %s AND (p.user_id = %s OR tm.user_id = %s)
            """,
            (project_id, user_id, user_id)
        )
        if not cur.fetchone():
            cur.close()
            conn.close()
            return None

    cur.execute(
        """
        SELECT id, score, created_at
        FROM reports
        WHERE project_id = %s
        ORDER BY id DESC
        """,
        (project_id,)
    )

    scans = cur.fetchall()

    cur.close()
    conn.close()

    return scans


def verify_scan_access(scan_id, user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT 1
        FROM reports r
        JOIN projects p ON p.id = r.project_id
        LEFT JOIN team_members tm ON p.team_id = tm.team_id
        WHERE r.id = %s AND (p.user_id = %s OR tm.user_id = %s)
        """,
        (scan_id, user_id, user_id)
    )

    result = cur.fetchone() is not None
    cur.close()
    conn.close()
    return result


def verify_project_access(project_id, user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT 1
        FROM projects p
        LEFT JOIN team_members tm ON p.team_id = tm.team_id
        WHERE p.id = %s AND (p.user_id = %s OR tm.user_id = %s)
        """,
        (project_id, user_id, user_id)
    )

    result = cur.fetchone() is not None
    cur.close()
    conn.close()
    return result


def verify_issue_access(issue_id, user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT 1
        FROM issues i
        JOIN reports r ON r.id = i.scan_id
        JOIN projects p ON p.id = r.project_id
        LEFT JOIN team_members tm ON p.team_id = tm.team_id
        WHERE i.id = %s AND (p.user_id = %s OR tm.user_id = %s)
        """,
        (issue_id, user_id, user_id)
    )

    result = cur.fetchone() is not None
    cur.close()
    conn.close()
    return result
