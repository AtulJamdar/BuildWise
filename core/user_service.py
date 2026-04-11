import re
import uuid
from datetime import datetime, timedelta, timezone
from db.connection import get_connection
from utils.auth import hash_password, verify_password, create_access_token

# --- 🧠 AUTHENTICATION LOGIC ---

def register_user(username, email, password, role="user"):
    hashed_pw = hash_password(password)
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 🟢 Changed "role_type" to "role" to match your DB constraint
        cur.execute(
            """
            INSERT INTO users (username, email, password, role, onboarding_done, plan, scan_count, scan_limit)
            VALUES (%s, %s, %s, %s, FALSE, 'free', 0, 10)
            """,
            (username, email, hashed_pw, role)
        )
        conn.commit()
        return {"success": True, "message": "User registered successfully"}
    except Exception as e:
        print(f"Registration Error: {e}") 
        return {"success": False, "message": "Registration failed. Check logs."}
    finally:
        cur.close()
        conn.close()

def get_user_by_email(email):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, username, onboarding_done FROM users WHERE email = %s", (email,))
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def is_username_taken(username):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
        return cur.fetchone() is not None
    finally:
        cur.close()
        conn.close()


def generate_unique_username(preferred_username):
    username = (preferred_username or "user").strip()
    if not username:
        username = "user"

    base_username = username
    suffix = 1
    while is_username_taken(username):
        username = f"{base_username}{suffix}"
        suffix += 1

    return username


def register_oauth_user(username, email, password, role="user"):
    if get_user_by_email(email):
        return {"success": False, "message": "User already exists"}

    unique_username = generate_unique_username(username)
    hashed_pw = hash_password(password)
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO users (username, email, password, role, onboarding_done, plan, scan_count, scan_limit)
            VALUES (%s, %s, %s, %s, FALSE, 'free', 0, 10)
            """,
            (unique_username, email, hashed_pw, role)
        )
        conn.commit()
        return {"success": True, "message": "User registered successfully", "username": unique_username}
    except Exception as e:
        print(f"OAuth Registration Error: {e}")
        return {"success": False, "message": "Registration failed. Check logs."}
    finally:
        cur.close()
        conn.close()


def oauth_login_user(email):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, username, onboarding_done FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        if not user:
            print(f"❌ OAuth login failed: User with email {email} not found.")
            return None

        token = create_access_token({"user_id": user[0], "username": user[1]})
        return {
            "access_token": token,
            "token_type": "bearer",
            "onboarding_done": bool(user[2]),
            "username": user[1]
        }
    except Exception as e:
        print(f"🔥 OAuth login error: {e}")
        return None
    finally:
        cur.close()
        conn.close()

def login_user(email, password):
    """
    Verifies credentials and returns a JWT access token plus onboarding status.
    """
    conn = get_connection()
    cur = conn.cursor()

    try:
        # ✅ FIX 1: Added 'onboarding_done' to the SELECT statement
        cur.execute("SELECT id, password, username, onboarding_done FROM users WHERE email = %s", (email,))
        user = cur.fetchone()

        if not user:
            print(f"❌ Login failed: User with email {email} not found.")
            return None 

        # ✅ FIX 2: Correct Tuple Indexing
        # user[0] = id, user[1] = hashed_pw, user[2] = username, user[3] = onboarding_done
        hashed_password_from_db = user[1]
        
        if not verify_password(password, hashed_password_from_db):
            print(f"❌ Login failed: Wrong password for {email}.")
            return None 

        # 3. Create a Secure Token (JWT)
        token = create_access_token({"user_id": user[0], "username": user[2]})
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "onboarding_done": bool(user[3]), # ✅ Index 3 is onboarding_done
            "username": user[2]
        }

    except Exception as e:
        print(f"🔥 Critical Login Error: {e}")
        return None
    finally:
        cur.close()
        conn.close()

# --- 👤 PROFILE & RESET LOGIC ---

def generate_reset_token(email):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        if not user:
            return None

        token = str(uuid.uuid4())
        expiry = datetime.now(timezone.utc) + timedelta(hours=1)

        cur.execute(
            "INSERT INTO password_resets (email, token, expires_at) VALUES (%s, %s, %s)",
            (email, token, expiry)
        )
        conn.commit()
        return token
    finally:
        cur.close()
        conn.close()


def reset_password(token, new_password):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT email, expires_at FROM password_resets WHERE token = %s",
            (token,)
        )
        record = cur.fetchone()
        if not record:
            return False

        email, expires_at = record
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > expires_at:
            return False

        hashed = hash_password(new_password)
        cur.execute(
            "UPDATE users SET password = %s WHERE email = %s",
            (hashed, email)
        )
        cur.execute(
            "DELETE FROM password_resets WHERE token = %s",
            (token,)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Reset Error: {e}")
        return False
    finally:
        cur.close()
        conn.close()


def get_user_plan_info(user_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT plan, scan_count, scan_limit, trial_ends FROM users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "plan": row[0] or "free",
            "scan_count": row[1] or 0,
            "scan_limit": row[2] or 10,
            "trial_ends": row[3]
        }
    finally:
        cur.close()
        conn.close()


def increment_scan_count(user_id, amount=1):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET scan_count = scan_count + %s WHERE id = %s",
            (amount, user_id)
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()