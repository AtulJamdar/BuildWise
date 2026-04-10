from db.connection import get_connection


def create_team(name, owner_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO teams (name, owner_id) VALUES (%s, %s) RETURNING id",
            (name, owner_id)
        )
        team_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO team_members (team_id, user_id, role) VALUES (%s, %s, %s)",
            (team_id, owner_id, "admin")
        )
        conn.commit()
        return team_id
    finally:
        cur.close()
        conn.close()


def get_user_teams(user_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT t.id, t.name, t.owner_id, tm.role
            FROM teams t
            JOIN team_members tm ON tm.team_id = t.id
            WHERE tm.user_id = %s
            """,
            (user_id,)
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


def get_team_by_id(team_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, name, owner_id FROM teams WHERE id = %s",
            (team_id,)
        )
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def user_is_team_member(user_id, team_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT 1 FROM team_members WHERE team_id = %s AND user_id = %s",
            (team_id, user_id)
        )
        return cur.fetchone() is not None
    finally:
        cur.close()
        conn.close()


def user_is_team_admin(user_id, team_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT role FROM team_members WHERE team_id = %s AND user_id = %s",
            (team_id, user_id)
        )
        row = cur.fetchone()
        return row is not None and row[0] in ("admin", "owner")
    finally:
        cur.close()
        conn.close()


def add_member_to_team(team_id, user_email, inviter_id, role="member"):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        user = cur.fetchone()
        if not user:
            return {"success": False, "message": "User not found."}
        new_user_id = user[0]

        if not user_is_team_admin(inviter_id, team_id):
            return {"success": False, "message": "Only team admins can invite members."}

        cur.execute(
            "SELECT 1 FROM team_members WHERE team_id = %s AND user_id = %s",
            (team_id, new_user_id)
        )
        if cur.fetchone():
            return {"success": False, "message": "This user is already a member of the team."}

        cur.execute(
            "INSERT INTO team_members (team_id, user_id, role) VALUES (%s, %s, %s)",
            (team_id, new_user_id, role)
        )
        conn.commit()
        return {"success": True, "message": "Member invited successfully."}
    finally:
        cur.close()
        conn.close()


def get_team_projects(team_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, project_name FROM projects WHERE team_id = %s",
            (team_id,)
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()
