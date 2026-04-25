"""
Admin Service
Handles admin authentication and authorization
"""
from db.connection import get_connection
from utils.auth import hash_password, verify_password, create_access_token
import os


def check_if_admin(user_id):
    """
    Check if a user has admin role
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT role FROM users WHERE id = %s",
            (user_id,)
        )
        result = cur.fetchone()
        
        if result and result[0] in ['admin', 'super_admin']:
            return True
        return False
        
    except Exception as e:
        print(f"❌ Error checking admin status: {e}")
        return False
    finally:
        cur.close()
        conn.close()


def get_admin_by_email(email):
    """
    Get admin user by email
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT id, email, username, password, role 
            FROM users 
            WHERE email = %s AND role IN ('admin', 'super_admin')
            """,
            (email,)
        )
        result = cur.fetchone()
        
        if result:
            return {
                "id": result[0],
                "email": result[1],
                "username": result[2],
                "password_hash": result[3],
                "role": result[4]
            }
        return None
        
    except Exception as e:
        print(f"❌ Error fetching admin: {e}")
        return None
    finally:
        cur.close()
        conn.close()


def admin_login(email, password):
    """
    Authenticate admin login
    Returns JWT token if successful
    """
    admin = get_admin_by_email(email)
    
    if not admin:
        return {
            "success": False,
            "message": "Admin not found"
        }
    
    # Verify password
    if not verify_password(password, admin["password_hash"]):
        return {
            "success": False,
            "message": "Invalid password"
        }
    
    # Create JWT token
    token = create_access_token(
        data={
            "sub": admin["id"],
            "email": admin["email"],
            "role": admin["role"]
        }
    )
    
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "admin_id": admin["id"],
        "admin_name": admin["username"],
        "role": admin["role"]
    }


def create_admin_user(email, password, username=None):
    """
    Create a new admin user
    Only super_admin or system can call this
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Check if email already exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return {"success": False, "message": "Email already exists"}
        
        hashed_pw = hash_password(password)
        
        cur.execute(
            """
            INSERT INTO users (username, email, password, role, onboarding_done, plan, scan_count, scan_limit)
            VALUES (%s, %s, %s, 'admin', TRUE, 'enterprise', 0, 99999)
            RETURNING id
            """,
            (username or email.split('@')[0], email, hashed_pw)
        )
        result = cur.fetchone()
        conn.commit()
        
        if result:
            return {
                "success": True,
                "admin_id": result[0],
                "message": "Admin user created successfully"
            }
        else:
            return {"success": False, "message": "Failed to create admin user"}
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        cur.close()
        conn.close()


def setup_default_admin():
    """
    Setup default admin if not exists
    Uses environment variables for credentials
    """
    admin_email = os.getenv("ADMIN_EMAIL", "atuljamdar4@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "atul@123")
    
    # Check if admin already exists
    admin = get_admin_by_email(admin_email)
    if admin:
        return {"success": True, "message": "Default admin already exists"}
    
    # Create default admin
    result = create_admin_user(admin_email, admin_password, "BuildWise Admin")
    
    if result["success"]:
        print(f"✅ Default admin created: {admin_email}")
    else:
        print(f"⚠️  Default admin creation failed: {result['message']}")
    
    return result


def get_all_admins():
    """
    Get list of all admin users (for super admin management)
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT id, username, email, role, created_at 
            FROM users 
            WHERE role IN ('admin', 'super_admin')
            ORDER BY created_at DESC
            """
        )
        admins = cur.fetchall()
        
        result = []
        for admin in admins:
            result.append({
                "id": admin[0],
                "username": admin[1],
                "email": admin[2],
                "role": admin[3],
                "created_at": admin[4]
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching admins: {e}")
        return []
    finally:
        cur.close()
        conn.close()
