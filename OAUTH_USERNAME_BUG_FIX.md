# GitHub OAuth Username Bug - Complete Analysis & Fix

## 🔴 THE ISSUE

When logging in via GitHub OAuth, the dashboard was showing:
- **Previous logged-in user's name** OR
- **Hardcoded "User" text**

Instead of the **current logged-in user's name**.

---

## 🔍 ROOT CAUSE ANALYSIS

### Problem Flow Breakdown:

**1️⃣ Backend (api/main.py - Line 1602)**
```
GitHub OAuth Callback Handler:
├─ Gets user info from GitHub API
├─ Calls oauth_login_user(email)
├─ Returns JWT token with username embedded
└─ ❌ PROBLEM: Username NOT passed to frontend in URL redirect
```

The backend was only redirecting with:
```
/oauth-success?token={app_token}&gh_token={access_token}
```

The username was available in the JWT payload but **not extracted and sent** to localStorage by the frontend.

**2️⃣ Frontend - OAuthSuccess.jsx (BEFORE FIX)**
```javascript
const params = new URLSearchParams(location.search);
const appToken = params.get("token");
const ghToken = params.get("gh_token");

localStorage.setItem("token", appToken);
localStorage.setItem("gh_token", ghToken);
// ❌ MISSING: localStorage.setItem("username", ...)
```

The component was **NOT fetching user profile data** after OAuth success.

**3️⃣ Frontend - App.jsx (Dashboard Display - Line 63)**
```javascript
const username = localStorage.getItem("username") || "User";
```

Since username wasn't saved in step 2, this falls back to:
- ❌ Old username from previous login (if existed)
- ❌ Hardcoded "User" text (if first login)

### Why This Happens:

| Scenario | Result |
|----------|--------|
| User A logs in with OAuth | `localStorage["username"] = "User A"` ✅ |
| User A logs out | `localStorage["username"]` still = "User A" |
| User B logs in with OAuth | ❌ `localStorage["username"]` still = "User A" (old value!) |
| User B sees dashboard | Shows "User A" name instead of "User B" |

---

## 🔧 THE FIX (Solution Implemented)

### What Was Changed:
**File: `buildwise-frontend/src/pages/OAuthSuccess.jsx`**

**BEFORE (Broken):**
```javascript
const checkOnboarding = async () => {
  try {
    const res = await fetch("http://localhost:8000/user/profile", {
      headers: { Authorization: `Bearer ${appToken}` }
    });
    const user = await res.json();
    
    if (user.is_onboarded) {
      navigate("/dashboard");
    } else {
      navigate("/onboarding");
    }
    // ❌ Never saves username to localStorage
  } catch (err) {
    navigate("/onboarding");
  }
};
```

**AFTER (Fixed):**
```javascript
const checkOnboarding = async () => {
  try {
    // ✨ NEW: Fetch full user profile instead of just onboarding status
    const profileRes = await fetch("http://localhost:8000/profile", {
      headers: { Authorization: `Bearer ${appToken}` }
    });

    if (!profileRes.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const userProfile = await profileRes.json();
    
    // 💾 KEY FIX: Save username to localStorage!
    if (userProfile.name) {
      localStorage.setItem("username", userProfile.name);
      console.log("✅ Username saved to localStorage:", userProfile.name);
    }

    // Use onboarding_done from profile response
    if (userProfile.onboarding_done) {
      navigate("/dashboard");
    } else {
      navigate("/onboarding");
    }
  } catch (err) {
    console.error("❌ Onboarding check failed:", err);
    navigate("/onboarding");
  }
};
```

### Key Changes:
1. **Changed endpoint** from `/user/profile` → `/profile`
   - `/profile` returns: `name`, `email`, `role_type`, `onboarding_done`, etc.
   - `/user/profile` returns: only `is_onboarded`

2. **Extract username** from `userProfile.name` field

3. **Save to localStorage** immediately:
   ```javascript
   localStorage.setItem("username", userProfile.name);
   ```

4. **Use profile's onboarding_done** directly instead of separate API call

---

## 📊 ALTERNATIVE APPROACHES CONSIDERED

### ❌ **Option 1: Pass Username in URL (REJECTED)**
```
Backend returns: /oauth-success?token=JWT&username=john_doe
```

**Why Rejected:**
- ⚠️ **Security Risk**: Usernames exposed in URL
- 🔗 Bookmarkable URLs expose user data
- 📸 Browser history leaks usernames
- 🚫 Best practice: Don't pass sensitive data in URL query params

---

### ❌ **Option 2: Extract from JWT Token (REJECTED)**
```javascript
const decoded = jwt_decode(appToken);
localStorage.setItem("username", decoded.username);
```

**Why Rejected:**
- ⚠️ **JWT Decoding Overhead**: Extra library dependency
- 🤔 **Validation Issue**: No guarantee JWT contains username
- 📡 **Doesn't verify backend state**: Could be stale data
- 🔄 **Race conditions**: If profile updated between OAuth and page load

---

### ✅ **Option 3: Fetch from API (CHOSEN - RECOMMENDED)**
```javascript
const profileRes = await fetch("http://localhost:8000/profile", {
  headers: { Authorization: `Bearer ${appToken}` }
});
const userProfile = await profileRes.json();
localStorage.setItem("username", userProfile.name);
```

**Why This is Best:**
1. ✅ **Secure**: No user data in URL
2. ✅ **Fresh Data**: Fetches latest from backend
3. ✅ **Validates Token**: Ensures JWT is valid before use
4. ✅ **Consistent**: Same pattern as normal login flow
5. ✅ **Reliable**: Single source of truth (backend)
6. ✅ **No Dependencies**: Uses standard fetch API
7. ✅ **Best Practice**: Mirrors production-grade OAuth implementations

---

## 🔄 BEFORE vs AFTER FLOW

### BEFORE (Broken):
```
GitHub OAuth
    ↓
Backend: Create user, generate JWT
    ↓
Redirect: /oauth-success?token=JWT&gh_token=TOKEN
    ↓
Frontend: Save token to localStorage ONLY
    ↓
Navigate to Dashboard
    ↓
Dashboard reads: localStorage.getItem("username") 
    ↓
Shows: Old username OR "User" (WRONG! ❌)
```

### AFTER (Fixed):
```
GitHub OAuth
    ↓
Backend: Create user, generate JWT
    ↓
Redirect: /oauth-success?token=JWT&gh_token=TOKEN
    ↓
Frontend: Save token to localStorage
    ↓
Frontend: Fetch user profile from backend ✨
    ↓
Frontend: Extract username from profile
    ↓
Frontend: Save username to localStorage 💾
    ↓
Navigate to Dashboard
    ↓
Dashboard reads: localStorage.getItem("username")
    ↓
Shows: Current user's username (CORRECT! ✅)
```

---

## 🚀 HOW TO TEST THE FIX

### Test Case 1: New User OAuth Login
```
1. Go to /login
2. Click "GitHub Login"
3. Authorize in GitHub
4. ✅ Dashboard should show YOUR GitHub username
5. Check browser console for: "✅ Username saved to localStorage: [your-name]"
```

### Test Case 2: Switch Users
```
1. User A: Login with GitHub → See "User A" on dashboard
2. User A: Click Logout
3. User B: Login with GitHub → See "User B" on dashboard (NOT "User A")
4. Verify localStorage.getItem("username") shows correct name
```

### Test Case 3: localStorage Inspection
```
1. After OAuth login, open DevTools (F12)
2. Go to Application → Local Storage
3. ✅ Should see: username = [your-actual-name]
4. ❌ Should NOT see: username = [previous-user-name]
```

---

## 📋 COMPARISON TABLE

| Feature | Before Fix | After Fix |
|---------|-----------|-----------|
| **Username saved after OAuth** | ❌ No | ✅ Yes |
| **Fetches fresh user data** | ❌ No | ✅ Yes |
| **Shows current user** | ❌ No | ✅ Yes |
| **User switching works** | ❌ No | ✅ Yes |
| **Same as normal login** | ❌ No | ✅ Yes |
| **Security** | ⚠️ Risky | ✅ Safe |
| **Validation** | ❌ None | ✅ Yes |

---

## 🎯 SUMMARY

### What Was The Problem?
The frontend wasn't saving the username to localStorage after GitHub OAuth login, causing the dashboard to display either the previous user's name or a hardcoded "User" text.

### Why Did It Happen?
`OAuthSuccess.jsx` was only saving the JWT token, not the username. Unlike normal login which calls an API and extracts the username from the response, OAuth success wasn't fetching user profile data.

### How Was It Fixed?
Modified `OAuthSuccess.jsx` to:
1. Fetch the user profile from `/profile` endpoint
2. Extract the `name` field (username)
3. Save it to localStorage before navigating
4. Directly use `onboarding_done` from the profile response

### Why This Approach?
✅ Secure (no sensitive data in URLs)
✅ Fresh (fetches current data)
✅ Validated (ensures token works)
✅ Consistent (mirrors normal login)
✅ Best practice (industry standard)

---

## 📝 FILES MODIFIED

- **`buildwise-frontend/src/pages/OAuthSuccess.jsx`**
  - Modified `checkOnboarding()` function
  - Added profile fetch before navigation
  - Added username storage to localStorage
