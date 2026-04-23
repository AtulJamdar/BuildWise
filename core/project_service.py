from db.connection import get_connection
from core.db_utils import execute_query, execute_update, verify_access


def get_or_create_project(name, repo_url, user_id, team_id=None):
    """Get project by name or create it if it doesn't exist."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Check if project exists
        if team_id:
            project = execute_query(
                "SELECT id FROM projects WHERE project_name = %s AND team_id = %s",
                (name, team_id),
                fetch_one=True
            )
        else:
            project = execute_query(
                "SELECT id FROM projects WHERE project_name = %s AND user_id = %s",
                (name, user_id),
                fetch_one=True
            )
        
        if project:
            return project[0]

        # Create new project
        new_id = execute_update(
            "INSERT INTO projects (project_name, repo_url, user_id, team_id) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, repo_url, user_id, team_id),
            return_id=True
        )
        return new_id
    finally:
        cur.close()
        conn.close()


def get_user_projects(user_id):
    """
    Fetches projects owned by the user or shared through teams.
    """
    print(f"🔍 Fetching projects for user_id: {user_id}")
    
    try:
        projects = execute_query(
            """
            SELECT DISTINCT p.id, p.project_name, p.team_id, t.name
            FROM projects p
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN team_members tm ON p.team_id = tm.team_id
            WHERE p.user_id = %s OR tm.user_id = %s
            """,
            (user_id, user_id)
        )
        print(f"📋 Found {len(projects)} projects: {projects}")
        return projects
    except Exception as e:
        print(f"❌ Database Error in get_user_projects: {e}")
        return []


def get_project_scans(project_id, user_id=None):
    """Fetch all scans for a project with optional access verification."""
    # Verify access if user_id provided
    if user_id is not None:
        if not verify_project_access(project_id, user_id):
            return None
    
    # Return all scans for the project
    return execute_query(
        """
        SELECT id, score, created_at
        FROM reports
        WHERE project_id = %s
        ORDER BY id DESC
        """,
        (project_id,)
    )


def verify_scan_access(scan_id, user_id):
    """Check if user has access to a scan."""
    return verify_access(
        """
        SELECT 1
        FROM reports r
        JOIN projects p ON p.id = r.project_id
        LEFT JOIN team_members tm ON p.team_id = tm.team_id
        WHERE r.id = %s AND (p.user_id = %s OR tm.user_id = %s)
        """,
        (scan_id, user_id, user_id),
        user_id
    )


def verify_project_access(project_id, user_id):
    """Check if user has access to a project."""
    return verify_access(
        """
        SELECT 1
        FROM projects p
        LEFT JOIN team_members tm ON p.team_id = tm.team_id
        WHERE p.id = %s AND (p.user_id = %s OR tm.user_id = %s)
        """,
        (project_id, user_id, user_id),
        user_id
    )


def verify_issue_access(issue_id, user_id):
    """Check if user has access to an issue."""
    return verify_access(
        """
        SELECT 1
        FROM issues i
        JOIN reports r ON r.id = i.scan_id
        JOIN projects p ON p.id = r.project_id
        LEFT JOIN team_members tm ON p.team_id = tm.team_id
        WHERE i.id = %s AND (p.user_id = %s OR tm.user_id = %s)
        """,
        (issue_id, user_id, user_id),
        user_id
    )
