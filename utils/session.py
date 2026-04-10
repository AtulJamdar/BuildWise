import os

SESSION_FILE = "session.txt"

def set_session(user_id, username, role):
    """Saves the user session data to a local file."""
    with open(SESSION_FILE, "w") as f:
        # We store as: id,username,role
        f.write(f"{user_id},{username},{role}")

def get_session_data():
    """
    Returns (user_id, username, role) as a tuple.
    Returns (None, None, None) if no session exists.
    """
    try:
        if os.path.exists(SESSION_FILE):
            with open(SESSION_FILE, "r") as f:
                data = f.read().strip().split(",")
                if len(data) == 3:
                    return int(data[0]), data[1], data[2]
        return None, None, None
    except Exception:
        return None, None, None

def get_current_user_id():
    """Returns the integer user_id from the session."""
    user_id, username, role = get_session_data()
    return user_id

def get_logged_in_user():
    """Returns the username from the session."""
    user_id, username, role = get_session_data()
    return username

def get_logged_in_role():
    """Returns the role (e.g., 'user', 'admin') from the session."""
    user_id, username, role = get_session_data()
    return role

def clear_session():
    """Deletes the session file to log the user out."""
    if os.path.exists(SESSION_FILE):
        os.remove(SESSION_FILE)
        return True
    return False