from core.project_service import get_user_projects, get_project_scans
from core.issue_service import get_scan_issues
from core.issue_service import get_scan_issues, get_issue_by_id, update_issue_status

def project_dashboard():
    projects = get_user_projects()

    if not projects:
        print("❌ No projects found")
        return

    print("\n=== Your Projects ===")

    for i, project in enumerate(projects, start=1):
        print(f"{i}. {project[1]} (Scans: {project[2]})")

    try:
        choice = int(input("\nSelect project: ")) - 1
        project_id = projects[choice][0]

        show_project_scans(project_id)

    except:
        print("❌ Invalid selection")


def show_project_scans(project_id):
    scans = get_project_scans(project_id)

    if not scans:
        print("❌ No scans found")
        return

    print("\n--- Scans ---")

    for i, scan in enumerate(scans, start=1):
        print(f"{i}. Score: {scan[1]} | Date: {scan[2]}")

    try:
        choice = int(input("\nSelect scan: ")) - 1
        scan_id = scans[choice][0]

        show_scan_issues(scan_id)

    except:
        print("❌ Invalid selection")


def show_scan_issues(scan_id):
    issues = get_scan_issues(scan_id)

    if not issues:
        print("❌ No issues found")
        return

    print("\n--- Issues ---")

    for i, issue in enumerate(issues, start=1):
        print(f"{i}. [{issue[2]}] {issue[3]} (Status: {issue[4]})")

    try:
        choice = int(input("\nSelect issue: ")) - 1
        issue_id = issues[choice][0]

        show_issue_detail(issue_id)

    except:
        print("❌ Invalid selection")


def show_issue_detail(issue_id):
    issue = get_issue_by_id(issue_id)

    if not issue:
        print("❌ Issue not found")
        return

    print("\n=== Issue Detail ===")
    print(f"ID: {issue[0]}")
    print(f"Type: {issue[3]}")
    print(f"Severity: {issue[4]}")
    print(f"Title: {issue[5]}")
    print(f"File: {issue[1]}")
    print(f"Line: {issue[2]}")
    print(f"\nWhy:\n{issue[6]}")
    print(f"\nFix:\n{issue[7]}")
    print(f"\nStatus: {issue[8]}")

    print("\nActions:")
    print("1. Mark as FIXED")
    print("2. Mark as IGNORED")
    print("3. Back")

    choice = input("Select action: ")

    if choice == "1":
        update_issue_status(issue_id, "FIXED")
    elif choice == "2":
        update_issue_status(issue_id, "IGNORED")
    elif choice == "3":
        return
    else:
        print("❌ Invalid choice")