from auth.auth_service import register, login
from auth.admin_service import promote_user
from cli.admin_menu import admin_dashboard
from cli.reviewer_menu import reviewer_dashboard, view_reports  # Added view_reports
from cli.profile_menu import profile_menu
from core.repo_scanner import scan_github_repo
from utils.role_guard import require_role
from utils.session import clear_session, get_logged_in_user
from core.issue_service import update_issue_status
from cli.project_menu import project_dashboard

def handle_command(args):
    if len(args) < 2:
        print("Usage: python main.py <command>")
        return

    command = args[1]

    # --- 1. Registration & Login ---
    if command == "register":
        username = input("Username: ")
        email = input("Email: ")
        password = input("Password: ")
        register(username, email, password)

    elif command == "login":
        username = input("Username: ")
        password = input("Password: ")
        login(username, password)

    # --- 2. Scanning ---
    elif command == "scan":
        role = require_role(["tester", "admin"])
        if not role: return
        
        from core.scanner import scan_project
        path = args[2] if len(args) > 2 else "."
        scan_project(path)

    elif command == "scan-repo":
        role = require_role(["tester", "admin"])
        if not role: return

        if len(args) < 3:
            print("Usage: python main.py scan-repo <repo_url>")
            return

        repo_url = args[2]
        scan_github_repo(repo_url)

    # --- 3. Admin & Role Management ---
    elif command == "promote":
        role = require_role(["admin"])
        if not role: return

        if len(args) < 4:
            print("Usage: python main.py promote <username> <role>")
            return

        username = args[2]
        new_role = args[3]
        promote_user(username, new_role)

    elif command == "dashboard":
        role = require_role(["admin"])
        if not role: return
        admin_dashboard()

    # --- 4. Reviewing & Reports ---
    elif command == "report":
        # Linked to the real view_reports function now!
        role = require_role(["reviewer", "admin"])
        if not role: return
        view_reports() 

    elif command == "review":
        role = require_role(["reviewer", "admin"])
        if not role: return
        reviewer_dashboard()

    # --- 5. User Profile & Session ---
    elif command == "profile":
        role = require_role(["admin", "tester", "reviewer"])
        if not role: return
        profile_menu()

    elif command == "logout":
        if clear_session():
            print("👋 Logged out successfully!")
        else:
            print("ℹ️ No active session found.")

    elif command == "update-issue":
        role = require_role(["admin", "tester", "reviewer"])

        if not role:
            return

        if len(args) < 4:
            print("Usage: python main.py update-issue <issue_id> <status>")
            return

        issue_id = args[2]
        status = args[3].upper()

        if status not in ["OPEN", "FIXED", "IGNORED"]:
            print("❌ Invalid status")
            return

        update_issue_status(issue_id, status)

    elif command == "projects":
        role = require_role(["admin", "tester", "reviewer"])

        if not role:
            return

        project_dashboard()

    else:
        print("Unknown command. Try: register, login, scan, scan-repo, report, profile, logout")