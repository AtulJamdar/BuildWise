from db.connection import get_connection
from utils.session import get_logged_in_user

def get_or_create_project(name, repo_url, user_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Check if project already exists for THIS user
        cur.execute(
            "SELECT id FROM projects WHERE project_name = %s AND user_id = %s", 
            (name, user_id)
        )
        project = cur.fetchone()

        if project:
            return project[0]

        # Create new project linked to user
        cur.execute(
            "INSERT INTO projects (project_name, repo_url, user_id) VALUES (%s, %s, %s) RETURNING id",
            (name, repo_url, user_id)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        return new_id
    finally:
        cur.close()
        conn.close()

def get_user_projects(user_id):
    """
    Fetches only the projects belonging to the specific logged-in user.
    """
    print(f"🔍 Fetching projects for user_id: {user_id}")
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # 🔒 SQL FIX: Filter by user_id so users can't see each other's data
        query = """
            SELECT id, project_name
            FROM projects 
            WHERE user_id = %s
        """
        cur.execute(query, (user_id,))
        projects = cur.fetchall()
        print(f"📋 Found {len(projects)} projects: {projects}")
        return projects
    except Exception as e:
        print(f"❌ Database Error in get_user_projects: {e}")
        return []
    finally:
        cur.close()
        conn.close()

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