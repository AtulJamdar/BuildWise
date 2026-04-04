from db.connection import get_connection

def promote_user(username, new_role):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "UPDATE users SET role=%s WHERE username=%s",
            (new_role, username)
        )
        conn.commit()

        if cur.rowcount == 0:
            print("❌ User not found")
        else:
            print(f"✅ {username} promoted to {new_role}")

    except Exception as e:
        print("❌ Error:", e)

    finally:
        cur.close()
        conn.close()