from utils.session import get_logged_in_role

def require_role(allowed_roles):
    role = get_logged_in_role() # Use the new Role-specific function

    if not role:
        return None

    if role in allowed_roles:
        return role

    print(f"❌ Access denied for role: {role}")
    return None