from utils.session import clear_session, get_current_user_id # Assuming you have this

def profile_menu():
    # 🟢 Move imports here to prevent Circular Import errors
    from core.user_service import view_profile, update_email
    
    user_id = get_current_user_id() # Get ID of logged-in user

    while True:
        print("\n=== Profile Menu ===")
        print("1. View Profile")
        print("2. Update Email")
        print("3. Logout")

        choice = input("Enter choice: ")

        if choice == "1":
            view_profile(user_id) # Pass the user_id

        elif choice == "2":
            new_email = input("Enter new email: ")
            update_email(user_id, new_email)

        elif choice == "3":
            clear_session()
            print("✅ Logged out")
            break
        else:
            print("❌ Invalid choice")