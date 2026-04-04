from db.connection import get_connection
import bcrypt
import re

def is_valid_email(email):
    # This pattern checks for: text + @ + text + . + text
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(pattern, email) is not None

def register(username, email, password):

    if not is_valid_email(email):
        print("❌ Invalid email format")
        return
    
    if len(password) < 6:
        print("❌ Password must be at least 6 characters")
        return
    
    conn = get_connection()
    cur = conn.cursor()

    role = "tester"  # default role
    
    # HASH the password correctly
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)

    try:
        cur.execute(
            "INSERT INTO users (username, email, password, role) VALUES (%s, %s, %s, %s)",
            (username, email, hashed_password.decode('utf-8'), role)
        )
        conn.commit()
        print("✅ User registered successfully")

    except Exception as e:
        if "unique" in str(e).lower():
            print("❌ Email already exists")
        else:
            print("❌ Error:", e)

    finally:
        cur.close()
        conn.close()


def login(username, password):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT password, role FROM users WHERE username=%s",
        (username,)
    )

    user = cur.fetchone()

    cur.close()
    conn.close()

    if user:
        stored_password, role = user
        if bcrypt.checkpw(password.encode(), stored_password.encode()):
            # SAVE BOTH: username and role separated by a comma
            with open("session.txt", "w") as f:
                f.write(f"{username},{role}") 
        
        print(f"✅ Login successful. Role: {role}")
        return role

    print("❌ Invalid credentials")
    return None

