# SECRET_KEY Management Guide
## Critical for JWT Token Validation & Admin Authentication

---

## The 401 Problem: Why SECRET_KEY Matters

The persistent **401 Unauthorized** errors you've been seeing on admin API requests are likely caused by a **SECRET_KEY mismatch**.

### How It Works:

1. **Token Creation** (admin login):
   - Backend creates JWT token using `SECRET_KEY` 
   - Token is returned to frontend and stored

2. **Token Validation** (admin API requests):
   - Frontend sends token in Authorization header
   - Backend attempts to decode token using `SECRET_KEY`
   - If `SECRET_KEY` doesn't match → **401 Unauthorized**

### The Problem:

If the `SECRET_KEY` used to CREATE the token is different from the one used to VALIDATE it, validation fails.

**This happens when:**
- No `SECRET_KEY` defined (backend uses default placeholder)
- `SECRET_KEY` changed between deployments
- Development & production use different keys
- Environment variable not being loaded

---

## How to Fix: Step by Step

### Local Testing (Before Deployment)

**Step 1: Generate a Secure SECRET_KEY**

```bash
# Option A: Using OpenSSL (best)
openssl rand -hex 32

# Example output:
# a7c2e8f1b9d3c4a6e2f8b1d9c7a3e5f1

# Option B: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Copy the output value
```

**Step 2: Create Local .env File**

```bash
# In d:\Python_Project\BuildWise\
copy .env.example .env
```

**Step 3: Edit .env with Your SECRET_KEY**

In `.env`, find or add this line:

```env
SECRET_KEY=your_generated_hex_string_here
```

Example:
```env
SECRET_KEY=a7c2e8f1b9d3c4a6e2f8b1d9c7a3e5f1
```

**Step 4: Verify Backend Loads SECRET_KEY**

```bash
# Start backend
cd d:\Python_Project\BuildWise
uvicorn api.main:app --reload

# You should see output like:
# INFO:     Started server process [1234]
# INFO:     Waiting for application startup.
```

**Step 5: Test Admin Login Locally**

```bash
# In another terminal:
curl -X POST http://localhost:8000/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin_password"}'

# Expected response (SUCCESS):
# {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","admin_id":1,"admin_name":"Admin","role":"admin"}

# If FAILED:
# {"detail":"Invalid admin credentials"}
# OR
# {"detail":"Invalid admin token"}
```

**Step 6: Test API with Token**

```bash
# Get token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Try API request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/admin/api/pricing-requests

# Expected: 200 with pricing requests list
# If 401: SECRET_KEY mismatch
```

---

### Deployment to Railway

**Critical Steps:**

**Step 1: Generate NEW SECRET_KEY for Production**

```bash
# Generate a fresh key for production (never reuse development keys)
openssl rand -hex 32

# Save the output
```

**Step 2: Add to Railway EXACTLY as shown**

1. Go to **Railway dashboard**
2. Click your backend service
3. Go to **Variables** tab
4. Click **"+ Add Variable"**
5. **Name field:** `SECRET_KEY`
6. **Value field:** Paste your generated hex string
7. **Important:** DO NOT add quotes around the value
8. Click **Save**

**Example (what it should look like in Railway):**
```
Name:  SECRET_KEY
Value: a7c2e8f1b9d3c4a6e2f8b1d9c7a3e5f1
```

**Step 3: Verify SECRET_KEY is Loaded**

After saving, Railway automatically restarts the backend.

Check the deployment logs:
1. Click **Deployments** tab
2. Find the new deployment (should show "Building" → "Deploying")
3. Click **View Logs**
4. Look for "SECRET_KEY loaded successfully" (or similar)

**Step 4: Test Production Admin Login**

```bash
curl -X POST https://your-railway-backend.railway.app/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin_password"}'

# Expected response (SUCCESS):
# {"access_token":"eyJ...","admin_id":1,"admin_name":"Admin","role":"admin"}
```

**Step 5: Test Production API with Token**

```bash
# Get token from response
TOKEN="eyJ..."

curl -H "Authorization: Bearer $TOKEN" \
  https://your-railway-backend.railway.app/admin/api/pricing-requests

# Expected: 200 with data
# If 401: Check SECRET_KEY again
```

---

## Troubleshooting: 401 Errors After Deployment

### Symptom: Login works but API returns 401

```
1. Admin login succeeds ✓
2. Token stored in localStorage ✓
3. Token sent in Authorization header ✓
4. GET /admin/api/pricing-requests → 401 ✗
```

**Diagnosis:**

Check if SECRET_KEY is loaded in Railway:

```bash
# Check Railway backend logs
1. Go to Railway dashboard → Backend service
2. Click "Deployments" tab
3. Find latest deployment
4. Click "View Logs"
5. Search for "SECRET_KEY" or "JWT"
6. Look for any errors like:
   - "Missing SECRET_KEY"
   - "No environment variable"
   - "JWT verification failed"
```

**Solutions (in order):**

**Solution 1: Verify SECRET_KEY is set**
```
1. Railway dashboard → Backend service
2. Go to "Variables" tab
3. Find "SECRET_KEY"
4. If not there → Add it (Step 2 above)
5. Redeploy
```

**Solution 2: SECRET_KEY length**
```
1. Verify SECRET_KEY is 32+ characters
2. If too short, generate new one:
   openssl rand -hex 32
3. Update Railway variable
4. Redeploy
```

**Solution 3: Check for typos**
```
1. Copy SECRET_KEY from Railway
2. Verify NO spaces at beginning or end
3. Verify NO quotes in the value
4. If changed, save and redeploy
```

**Solution 4: Restart backend**
```
1. Railway dashboard → Backend service
2. Click "Deployments" tab
3. Find latest deployment
4. Click three-dots menu → "Redeploy"
5. Wait for rebuild and restart
```

**Solution 5: Check database connectivity**
```
# The 401 might be masking a database error
1. Try to view backend logs
2. Look for database connection errors
3. If DATABASE_URL is wrong, fix it
4. Redeploy
```

---

## Best Practices

### DO ✓
- [ ] Generate SECRET_KEY with `openssl rand -hex 32`
- [ ] Keep SECRET_KEY 32+ characters
- [ ] Store SECRET_KEY in Railway Variables (not in code)
- [ ] Use same SECRET_KEY for all instances of the same environment
- [ ] Document which SECRET_KEY is for which environment
- [ ] Never share SECRET_KEY in messages or code reviews

### DON'T ✗
- [ ] Use hardcoded SECRET_KEY in code
- [ ] Commit .env to Git
- [ ] Reuse development SECRET_KEY in production
- [ ] Share SECRET_KEY with team members
- [ ] Use weak keys (short strings)
- [ ] Change SECRET_KEY between deployments (breaks existing tokens)

---

## If You Need to Rotate SECRET_KEY

### Scenario: SECRET_KEY was compromised

**Important:** Changing SECRET_KEY invalidates ALL existing tokens.

**Steps:**
1. Generate NEW SECRET_KEY: `openssl rand -hex 32`
2. Update Railway Variables with new key
3. All users must log in again (old tokens invalid)
4. Notify users of the update

---

## Verification Checklist

Before going live, verify:

- [ ] SECRET_KEY generated with `openssl rand -hex 32`
- [ ] SECRET_KEY is 32+ characters long
- [ ] SECRET_KEY added to Railway Variables (exact name: `SECRET_KEY`)
- [ ] No quotes around SECRET_KEY value
- [ ] No spaces before or after value
- [ ] Backend redeployed after adding SECRET_KEY
- [ ] Admin login test succeeded with token
- [ ] API request with token returned 200 (not 401)
- [ ] Backend logs show no JWT errors

---

## Testing Script

Save this as `test_jwt.py` to validate locally:

```python
import jwt
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
print(f"SECRET_KEY loaded: {bool(SECRET_KEY)}")
print(f"SECRET_KEY length: {len(SECRET_KEY) if SECRET_KEY else 0}")

if not SECRET_KEY or len(SECRET_KEY) < 32:
    print("❌ ERROR: SECRET_KEY is missing or too short!")
    exit(1)

# Create test token
payload = {"sub": "1", "role": "admin"}
try:
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    print(f"✓ Token created: {token[:50]}...")
    
    # Decode test token
    decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    print(f"✓ Token decoded: {decoded}")
    print("✅ All JWT operations successful!")
except Exception as e:
    print(f"❌ JWT Error: {e}")
    exit(1)
```

**Run it:**
```bash
python test_jwt.py

# Expected output:
# SECRET_KEY loaded: True
# SECRET_KEY length: 64
# ✓ Token created: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ✓ Token decoded: {'sub': '1', 'role': 'admin'}
# ✅ All JWT operations successful!
```

---

## Summary

The 401 error you've been experiencing is almost certainly caused by SECRET_KEY mismatch. By following this guide:

1. ✅ Generate a secure SECRET_KEY
2. ✅ Add it to Railway Variables
3. ✅ Redeploy backend
4. ✅ Test admin login and API requests
5. ✅ Verify tokens are validated correctly

**Expected Result:** Admin authentication working end-to-end, 401 errors resolved.

---

**For more help:** Check `DEPLOYMENT_GUIDE.md` or `DEPLOYMENT_QUICK_START.md`
