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
            INSERT INTO users (username, email, password, role, onboarding_done) 
            VALUES (%s, %s, %s, %s, FALSE)
            """,
            (username, email, hashed_pw, role)
        )
        conn.commit()
        return {"success": True, "message": "User registered successfully"}
    except Exception as e:
        # It's better to print the real error 'e' to the console for debugging
        print(f"Registration Error: {e}") 
        return {"success": False, "message": "Registration failed. Check logs."}
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
    token = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET reset_token=%s, reset_expiry=%s WHERE email=%s",
            (token, expiry, email)
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
            "SELECT id, reset_expiry FROM users WHERE reset_token=%s",
            (token,)
        )
        user = cur.fetchone()

        if not user or not user[1]:
            return False

        # Ensure expiry comparison works
        expiry = user[1]
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > expiry:
            return False

        hashed = hash_password(new_password)
        cur.execute(
            "UPDATE users SET password=%s, reset_token=NULL, reset_expiry=NULL WHERE id=%s",
            (hashed, user[0])
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Reset Error: {e}")
        return False
    finally:
        cur.close()
        conn.close()