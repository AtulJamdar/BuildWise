from core.user_service import view_profile, update_email
from utils.session import clear_session

def profile_menu():
    while True:
        print("\n=== Profile Menu ===")
        print("1. View Profile")
        print("2. Update Email")
        print("3. Logout")

        choice = input("Enter choice: ")

        if choice == "1":
            view_profile()

        elif choice == "2":
            update_email()

        elif choice == "3":
            clear_session()
            print("✅ Logged out")
            break

        else:
            print("❌ Invalid choice")