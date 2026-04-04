from db.connection import get_connection
from utils.session import get_logged_in_user
import re

def view_profile():
    # This now gets "atul" instead of "admin"
    username = get_logged_in_user() 
    
    if not username:
        print("❌ No active session found.")
        return

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT username, email, role FROM users WHERE username = %s", (username,))
        user_data = cur.fetchone()

        if user_data:
            u_name, u_email, u_role = user_data
            print("\n--- 👤 Your Profile ---")
            print(f"Username: {u_name}")
            print(f"Email:    {u_email}")
            print(f"Role:     {u_role}")
        else:
            # This is where your error was happening
            print(f"❌ User '{username}' not found in database.")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        cur.close()
        conn.close()

        
def update_email():
    username = get_logged_in_user()

    new_email = input("Enter new email: ")

    if not re.match(r"[^@]+@[^@]+\.[^@]+", new_email):
        print("❌ Invalid email format")
        return

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "UPDATE users SET email=%s WHERE username=%s",
            (new_email, username)
        )
        conn.commit()
        print("✅ Email updated")

    except Exception as e:
        print("❌ Error (email might already exist)")

    cur.close()
    conn.close()