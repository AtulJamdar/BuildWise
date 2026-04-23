"""
DIAGNOSTIC: Issue Details Page Flow Analysis
=============================================

This document explains why the 404 errors are occurring and what was fixed.
"""

# ISSUES FOUND & FIXED:
# ====================

# 1. github_match_issue endpoint (Line 513)
# PROBLEM: Still trying to access 'issue' as tuple with indices after dictionary conversion
# BEFORE:
#   exact_line = robust_match(lines, {
#       "code": issue[3],        # ❌ WRONG - issue is now a dict
#       "context_before": issue[16],
#       "context_after": issue[17],
#       "line": issue[2],
#   })
# AFTER:
#   exact_line = robust_match(lines, {
#       "code": issue["code"],        # ✅ CORRECT - dict access
#       "context_before": issue["context_before"],
#       "context_after": issue["context_after"],
#       "line": issue["line"],
#   })
# STATUS: ✅ FIXED in api/main.py


# 2. preview_fix endpoint (Line 559)
# STATUS: ✅ ALREADY FIXED - Was using issue_row["code"], etc. (dictionary keys)


# 3. get_issue endpoint (Line 842)
# STATUS: ✅ ALREADY FIXED - Returns dictionary with proper keys


# FLOW AFTER SCAN:
# ================

# When user clicks on an issue in the scan results:
# 
# 1. Frontend loads issue details:
#    GET /issues/1690
#    └─> get_issue() endpoint
#        ├─> verify_issue_access(issue_id, user_id)  
#        │   └─> Checks if user can access this issue
#        │
#        ├─> get_issue_by_id(issue_id)  
#        │   └─> Returns issue as DICTIONARY with keys:
#        │       {
#        │         "id": ...,
#        │         "file": ...,
#        │         "code": ...,
#        │         "context_before": {...},
#        │         "context_after": {...},
#        │         ... etc
#        │       }
#        │
#        ├─> get_issue_activity(issue_id)
#        │   └─> Returns activity log
#        │
#        └─> Returns issue data to frontend
#
# 2. User clicks "Preview GitHub Match" button:
#    GET /issues/1690/github-match
#    └─> github_match_issue() endpoint
#        ├─> verify_issue_access(issue_id, user_id)
#        ├─> get_issue_by_id(issue_id)  
#        │   └─> Returns issue as DICTIONARY
#        │
#        ├─> get_issue_repo_info(issue_id)
#        │   └─> Fetches repo URL, commit, branch, path
#        │
#        ├─> fetch_github_file_lines() - Gets file from GitHub
#        │
#        ├─> robust_match(lines, {
#        │       "code": issue["code"],      # ✅ FIXED
#        │       "context_before": issue["context_before"],
#        │       "context_after": issue["context_after"],
#        │       "line": issue["line"],
#        │   })
#        │   └─> Finds exact line in GitHub file that matches issue
#        │
#        └─> Returns match results to frontend
#
# 3. User clicks "Preview Fix" button:
#    POST /issues/1690/fix-preview
#    └─> preview_fix() endpoint
#        ├─> get_issue_by_id(issue_id)
#        │   └─> Returns issue as DICTIONARY
#        │
#        ├─> get_github_file() - Gets file from GitHub
#        │
#        ├─> robust_match(lines, {
#        │       "code": issue_row["code"],        # ✅ Already using dict keys
#        │       "context_before": ...,
#        │       ...
#        │   })
#        │
#        ├─> generate_fix() - AI generates fix
#        │
#        ├─> apply_fix() - Applies fix to code
#        │
#        ├─> validate_code() - Validates syntax
#        │
#        └─> Returns diff and fixed code to frontend
#
# 4. User clicks "Apply Fix via PR":
#    POST /issues/1690/apply-fix
#    └─> apply_fix_issue() endpoint
#        ├─> get_issue_by_id(issue_id)
#        │   └─> Returns issue as DICTIONARY
#        │
#        ├─> issue_row.get("fixable", True)  # ✅ Now works! Dictionary has .get()
#        │
#        ├─> get_github_file() and apply_fix()
#        │
#        ├─> Creates PR on GitHub
#        │
#        └─> Returns PR result to frontend


# POTENTIAL REASONS FOR 404 ERRORS:
# ==================================

# 1. ✅ FIXED: github_match_issue was accessing issue as tuple
#    This would cause KeyError when trying issue[3], which would propagate as 500 error

# 2. Token/Auth Issue:
#    - If Bearer token is invalid, get_current_user raises 401
#    - Browser shows this as 404 in console (sometimes)
#    - Check: localStorage has valid "token" value

# 3. Issue Not Found:
#    - If issue_id 1690 doesn't exist in database
#    - Endpoint returns 404 "Issue not found"
#    - Check: Run scan and verify issue is saved to DB

# 4. Repo Info Missing:
#    - If issue_repo_info is None (scan_id/project_id doesn't exist)
#    - Endpoint returns 400 "Repo info unavailable"
#    - Check: Verify scan was created and linked to issue


# VERIFICATION CHECKLIST:
# =======================

□ Run full scan from Projects page
□ Verify scan appears in database
□ Click on issue from scan results
□ Check /issues/1690 endpoint works (get issue details)
□ Click "Preview GitHub Match" button
□ Verify /issues/1690/github-match returns data (not 404)
□ Click "Preview Fix" button  
□ Verify /issues/1690/fix-preview returns diff
□ Click "Apply Fix via PR"
□ Verify /issues/1690/apply-fix creates PR

# COMMON ISSUES TO CHECK:

1. Is the backend still running?
   - Backend should be at http://localhost:8000
   - Check terminal running uvicorn

2. Is the token valid?
   - Login again in frontend
   - Check localStorage has "token"
   - Token should be a valid JWT

3. Did the scan complete successfully?
   - Check database has issues for this scan
   - SELECT * FROM issues WHERE scan_id = <your_scan_id>;

4. Is the issue linked to a project?
   - Issue needs project_id to fetch repo info
   - SELECT * FROM issues WHERE id = 1690;
