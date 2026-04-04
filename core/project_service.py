from db.connection import get_connection
from utils.session import get_logged_in_user

def get_or_create_project(project_name, repo_url=None):
    conn = get_connection()
    cur = conn.cursor()

    username = get_logged_in_user()

    # Check if project exists
    cur.execute(
        "SELECT id FROM projects WHERE username=%s AND project_name=%s",
        (username, project_name)
    )

    result = cur.fetchone()

    if result:
        project_id = result[0]
    else:
        cur.execute(
            "INSERT INTO projects (username, project_name, repo_url) VALUES (%s, %s, %s) RETURNING id",
            (username, project_name, repo_url)
        )
        project_id = cur.fetchone()[0]
        conn.commit()

    cur.close()
    conn.close()

    return project_id

def get_user_projects():
    from db.connection import get_connection
    from utils.session import get_logged_in_user

    conn = get_connection()
    cur = conn.cursor()

    username = get_logged_in_user()

    cur.execute(
        """
        SELECT p.id, p.project_name, COUNT(r.id) as total_scans
        FROM projects p
        LEFT JOIN reports r ON p.id = r.project_id
        WHERE p.username = %s
        GROUP BY p.id
        ORDER BY p.id DESC
        """,
        (username,)
    )

    projects = cur.fetchall()

    cur.close()
    conn.close()

    return projects

def get_project_scans(project_id):
    from db.connection import get_connection

    conn = get_connection()
    cur = conn.cursor()

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