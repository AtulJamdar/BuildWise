import os

SESSION_FILE = "session.txt"

def get_session_data():
    """Returns (username, role) or (None, None)"""
    try:
        if os.path.exists(SESSION_FILE):
            with open(SESSION_FILE, "r") as f:
                data = f.read().strip().split(",")
                if len(data) == 2:
                    return data[0], data[1] # username, role
        return None, None
    except:
        return None, None

def get_logged_in_user():
    username, role = get_session_data()
    return username

def get_logged_in_role():
    username, role = get_session_data()
    return role

def clear_session():
    if os.path.exists(SESSION_FILE):
        os.remove(SESSION_FILE)
        return True
    return False