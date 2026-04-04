from auth.admin_service import promote_user
from db.connection import get_connection
from utils.session import clear_session

def admin_dashboard():
    while True:
        print("\n=== Admin Dashboard ===")
        print("1. View Users")
        print("2. Promote User")
        print("3. View Stats")
        print("4. Logout")

        choice = input("Enter choice: ")

        if choice == "1":
            view_users()

        elif choice == "2":
            promote_user_menu()

        elif choice == "3":
            view_stats()

        elif choice == "4":
            clear_session()
            print("✅ Logged out")
            break

        else:
            print("❌ Invalid choice")

def view_users():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT username, role FROM users")
    users = cur.fetchall()

    print("\n--- Users ---")
    for i, user in enumerate(users, start=1):
        print(f"{i}. {user[0]} ({user[1]})")

    cur.close()
    conn.close()

def promote_user_menu():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT username, role FROM users")
    users = cur.fetchall()

    print("\nSelect User:")
    for i, user in enumerate(users, start=1):
        print(f"{i}. {user[0]} ({user[1]})")

    try:
        choice = int(input("Enter number: ")) - 1
        username = users[choice][0]

        print("\nSelect Role:")
        print("1. Admin")
        print("2. Tester")
        print("3. Reviewer")

        role_choice = input("Enter role number: ")

        role_map = {
            "1": "admin",
            "2": "tester",
            "3": "reviewer"
        }

        new_role = role_map.get(role_choice)

        if not new_role:
            print("❌ Invalid role")
            return

        promote_user(username, new_role)

    except:
        print("❌ Invalid selection")

    cur.close()
    conn.close()


def view_stats():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM users WHERE role='tester'")
    testers = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM users WHERE role='reviewer'")
    reviewers = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM reports")
    reports = cur.fetchone()[0]

    print("\n--- System Stats ---")
    print(f"Testers: {testers}")
    print(f"Reviewers: {reviewers}")
    print(f"Total Reports: {reports}")

    cur.close()
    conn.close()


def clear_session():
    import os
    if os.path.exists("session.txt"):
        os.remove("session.txt")