import json
from db.connection import get_connection

def reviewer_dashboard():
    while True:
        print("\n=== Reviewer Dashboard ===")
        print("1. View Reports")
        print("2. Logout")

        choice = input("Enter choice: ")

        if choice == "1":
            view_reports()

        elif choice == "2":
            from utils.session import clear_session
            clear_session()
            print("✅ Logged out")
            break

        else:
            print("❌ Invalid choice")

def view_reports():
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, project_name, score FROM reports ORDER BY id DESC")
        reports = cur.fetchall()

        if not reports:
            print("ℹ️ No reports found in the database.")
            return

        print("\n--- Reports ---")
        for i, report in enumerate(reports, start=1):
            print(f"{i}. {report[1]} (Score: {report[2]})")

        user_input = input("Select report number (or 'b' to go back): ")
        
        if user_input.lower() == 'b':
            return

        try:
            choice = int(user_input) - 1
            if 0 <= choice < len(reports):
                report_id = reports[choice][0]
                show_report_details(report_id)
            else:
                print(f"❌ Selection must be between 1 and {len(reports)}")

        except ValueError:
            print("❌ Please enter a valid number.")
            
    except Exception as e:
        print(f"❌ Database Error: {e}")
    finally:
        if conn:
            conn.close()

def show_report_details(report_id):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT project_name, score, summary, issues FROM reports WHERE id=%s",
            (report_id,)
        )

        report = cur.fetchone()

        if not report:
            print("❌ Report not found")
            return

        project_name, score, summary, issues = report

        # Logic to handle if data is already a dict (Postgres JSONB) or a string (JSON)
        final_summary = summary if isinstance(summary, dict) else json.loads(summary)
        
        # Logic to handle issues (checks if it's already a list or needs parsing)
        if isinstance(issues, list):
            final_issues = issues
        else:
            try:
                final_issues = json.loads(issues)
            except:
                import ast
                final_issues = ast.literal_eval(issues)

        print(f"\n==============================")
        print(f"📋 REPORT: {project_name}")
        print(f"==============================")
        print(f"Final Score: {score}/100\n")

        print("📊 SUMMARY STATS:")
        for key, value in final_summary.items():
            print(f"  - {key}: {value}")

        print("\n📝 DETECTED ISSUES:")
        if not final_issues:
            print("  ✅ No issues detected.")
        else:
            # ✅ UPDATED STEP 4: Handle New Issue Format
            for issue in final_issues:
                if isinstance(issue, dict):
                    # Display new format with ID, Title, and Status
                    # Note: We use .get() to avoid errors if a key is missing
                    print(f"\nID: {issue.get('id', 'N/A')}")
                    print(f"[{issue.get('severity', 'UNKNOWN')}] {issue.get('title', 'No Title')}")
                    print(f"File: {issue.get('file', 'N/A')}")
                    print(f"Status: {issue.get('status', 'OPEN')}")
                    print(f"Why: {issue.get('why', 'N/A')}")
                
                # Fallback for old tuple-style reports
                elif isinstance(issue, (list, tuple)) and len(issue) == 2:
                    severity, message = issue
                    print(f"  [{severity}] {message}")
                else:
                    print(f"  - {issue}")
                    
        print(f"\n==============================\n")

    except Exception as e:
        print(f"❌ System Error while showing details: {e}")
    finally:
        if conn:
            conn.close()