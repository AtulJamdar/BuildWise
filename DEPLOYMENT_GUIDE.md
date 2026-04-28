# BuildWise Complete Deployment Guide
## Vercel (Frontend) + Railway (Backend)

**Last Updated:** $(date)  
**Status:** Prototype Deployment Ready  
**Author:** BuildWise Development Team

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Backend Deployment (Railway)](#backend-deployment-railway)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Post-Deployment Configuration](#post-deployment-configuration)
5. [Testing & Validation](#testing--validation)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Phase 1: Local Verification (BEFORE any deployment)

- [ ] **Backend Requirements**
  - [ ] Python 3.11+ installed locally
  - [ ] `pip install -r requirements.txt` completed
  - [ ] PostgreSQL running locally
  - [ ] `.env` file created locally with all values filled
  - [ ] Backend starts: `uvicorn api.main:app --reload`
  - [ ] Test admin login: `POST http://localhost:8000/auth/admin-login`

- [ ] **Frontend Requirements**
  - [ ] Node.js 18+ installed
  - [ ] `npm install` completed in `buildwise-frontend/`
  - [ ] Frontend builds: `npm run build` without errors
  - [ ] Frontend dev server runs: `npm run dev`
  - [ ] All routes accessible (admin, pricing, etc.)

- [ ] **Git Repository**
  - [ ] Repository pushed to GitHub
  - [ ] `.env` is in `.gitignore` (DO NOT commit secrets)
  - [ ] All code committed and pushed
  - [ ] No uncommitted changes

### Phase 2: Accounts & Credentials Required

**Before you start, gather:**
- [ ] GitHub account with repository access
- [ ] Vercel account (free tier sufficient)
- [ ] Railway account (free tier sufficient, $5/month after trial)
- [ ] PostgreSQL database URL (Railway will provide)
- [ ] All API keys:
  - [ ] GROQ_API_KEY
  - [ ] HUGGINGFACE_API_KEY
  - [ ] GITHUB_CLIENT_ID & SECRET
  - [ ] GOOGLE_CLIENT_ID & SECRET
  - [ ] RAZORPAY_KEY_ID & SECRET
  - [ ] EMAIL_SENDER & EMAIL_PASSWORD (Gmail/SendGrid)

---

## Backend Deployment (Railway)

### Step 1: Create Railway Database

1. Go to **[Railway.app](https://railway.app)**
2. Log in or sign up
3. Create new project: **New Project** → **Database** → **PostgreSQL**
4. Wait for database to initialize (~2 minutes)
5. Once created, click the PostgreSQL box → **Connect** tab
6. Copy the **DATABASE_URL** (looks like: `postgresql://user:pass@host:port/dbname`)
7. Save this value - you'll need it in Step 3

**Expected Format:**
```
postgresql://postgres:password123@containers-us-west-xyz.railway.app:7932/railway
```

### Step 2: Prepare Backend Repository

1. **Ensure all code is pushed to GitHub:**
   ```bash
   cd d:\Python_Project\BuildWise
   git status
   git add .
   git commit -m "Deploy: Ready for Railway deployment"
   git push origin main
   ```

2. **Verify Procfile exists at root:**
   ```bash
   cat Procfile
   # Expected output:
   # web: uvicorn api.main:app --host 0.0.0.0 --port $PORT
   # release: python -m alembic upgrade head
   ```

3. **Create .env file locally (for reference only - won't be deployed):**
   ```bash
   copy .env.example .env
   # OR on Linux/Mac: cp .env.example .env
   ```

### Step 3: Create Railway Backend Service

1. In Railway dashboard, click **+ Add** → **GitHub Repo**
2. **Authorize Railway** to access your GitHub account
3. **Select your repository** containing the BuildWise code
4. Select branch: `main`
5. Railway auto-detects as Python project (reads Procfile)
6. Click **Deploy** - Railway starts building (~3-5 minutes)

**During build, you'll see:**
```
[Build] Cloning repository...
[Build] Installing Python 3.11...
[Build] Installing dependencies from requirements.txt...
[Build] Build completed
[Deploy] Starting uvicorn service...
[Deploy] Service running on PORT $PORT
```

### Step 4: Configure Environment Variables in Railway

1. Once service is deployed, go to Railway dashboard
2. Click on your backend service → **Variables** tab
3. Click **+ Add Variable** and add each of these:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:port/dbname` | Copy from PostgreSQL box → Connect tab |
| `SECRET_KEY` | Generate new: `openssl rand -hex 32` | Must be 32+ characters, same SECRET_KEY used for JWT |
| `GROQ_API_KEY` | Your Groq API key | From Groq console |
| `HUGGINGFACE_API_KEY` | Your HF token | From HuggingFace settings |
| `GITHUB_CLIENT_ID` | Your GitHub OAuth app ID | From GitHub Developer settings |
| `GITHUB_CLIENT_SECRET` | Your GitHub OAuth app secret | From GitHub Developer settings |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | From Google Cloud console |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret | From Google Cloud console |
| `GOOGLE_REDIRECT_URI` | `https://<your-railway-url>/auth/google/callback` | Format: `https://projectname-backend.railway.app/auth/google/callback` |
| `RAZORPAY_KEY_ID` | Test/Production Razorpay key | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | Test/Production Razorpay secret | From Razorpay dashboard |
| `EMAIL_SENDER` | `your-email@gmail.com` | For sending password reset emails |
| `EMAIL_PASSWORD` | Gmail app password | NOT your Gmail password - use app-specific password |
| `FRONTEND_URL` | `https://your-vercel-project.vercel.app` | Add AFTER frontend is deployed |
| `BACKEND_URL` | `https://projectname-backend.railway.app` | Railway provides this URL |

4. After adding all variables, Railway automatically restarts the service
5. **Get your Railway backend URL:**
   - Click on your backend service
   - Go to **Settings** tab
   - Find **Domains** section
   - Copy the URL (format: `https://projectname-backend.railway.app`)
   - **Save this - needed for frontend deployment**

### Step 5: Verify Backend Deployment

Test your backend is running:

```bash
# Test health check (if you have a /health endpoint)
curl https://your-railway-backend.railway.app/docs

# Test admin login
curl -X POST https://your-railway-backend.railway.app/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin_password"}'

# Expected response:
# {"access_token": "eyJhbGc...", "admin_id": 1, "admin_name": "Admin", "role": "admin"}
```

**Expected FastAPI Swagger UI at:** `https://your-railway-backend.railway.app/docs`

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend Repository

The frontend is in `buildwise-frontend/` subdirectory. Vercel needs to be configured for monorepo structure.

1. **Verify build works locally:**
   ```bash
   cd buildwise-frontend
   npm install
   npm run build
   # Should create `dist/` folder with no errors
   ls dist/
   ```

2. **Ensure frontend code is pushed to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy: Frontend ready for Vercel"
   git push origin main
   ```

### Step 2: Create Vercel Project

1. Go to **[Vercel.com](https://vercel.com)**
2. Log in or sign up (can use GitHub account)
3. Click **Add New** → **Project**
4. Select your GitHub repository from the list
5. If private repo, authorize access
6. Click **Import**

### Step 3: Configure Vercel Build Settings

On the import screen, configure:

1. **Project Name:** `buildwise-frontend` (or your choice)
2. **Framework Preset:** Select **Vite**
3. **Root Directory:** Click **Edit** and set to `buildwise-frontend`
4. **Build Command:** Should auto-detect as `npm run build` ✓
5. **Output Directory:** Should auto-detect as `dist` ✓
6. **Install Command:** Should be `npm install` ✓

### Step 4: Add Environment Variables in Vercel

Before clicking Deploy, you must add environment variables:

1. Click **Environment Variables**
2. Add variable named: `VITE_API_URL`
3. **Value:** (PASTE YOUR RAILWAY BACKEND URL from Step 5 of Backend Deployment)
   ```
   https://your-railway-backend.railway.app
   ```
4. Make sure it's available for **Production**
5. Click **Deploy** (final step)

**Vercel starts building (~2-3 minutes):**
```
[Build] npm install...
[Build] npm run build...
[Build] Verifying build...
[Deploy] Deploying to production...
[Deploy] Live at: https://buildwise-frontend.vercel.app
```

### Step 5: Get Frontend URL

After deployment completes:
- You'll see: **Live:** followed by your URL
- Format: `https://buildwise-frontend.vercel.app`
- **Save this URL** - needed for Railway backend configuration

---

## Post-Deployment Configuration

### Step 1: Update Backend with Frontend URL

Now that frontend is deployed, add it to backend environment variables:

1. Go to **Railway dashboard** → Your backend service
2. Go to **Variables** tab
3. Find or add: `FRONTEND_URL`
4. Set value to your Vercel URL: `https://buildwise-frontend.vercel.app`
5. Save - service auto-restarts

### Step 2: Update CORS Settings (if needed)

If you get CORS errors, the backend needs to allow frontend origin:

In `api/main.py`, check the CORS configuration:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://buildwise-frontend.vercel.app", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If CORS is not configured, add this to `api/main.py` (after imports):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then push this change and Railway will auto-redeploy.

### Step 3: Test Connection Between Frontend & Backend

1. **Open your frontend URL:** `https://buildwise-frontend.vercel.app`
2. **Navigate to Admin Login:** `/admin/login`
3. **Try to log in** with test credentials
4. **Check browser console** (F12) for any errors
5. **Expected:** Login succeeds and token stores in localStorage

---

## Testing & Validation

### Smoke Tests (Run in order)

#### Test 1: Frontend Loads
```
1. Open https://buildwise-frontend.vercel.app
2. Verify page loads (not blank)
3. Navigate to /admin/login
4. Verify login form appears
```

#### Test 2: Admin Login
```
1. Enter admin username and password
2. Click "Login"
3. Check browser console - should show token saved
4. If successful: redirected to /admin/dashboard
5. If error: check console for API errors (likely 401 or connection refused)
```

#### Test 3: Pricing Pages
```
1. Navigate to /pricing
2. Verify pricing cards load
3. Try to view plan details
4. Should load without errors
```

#### Test 4: API Connectivity
```bash
# From any terminal, test backend is responding
curl https://your-railway-backend.railway.app/docs

# Should return FastAPI Swagger UI (HTML page)
```

### Debugging Common Issues

#### Issue: Blank Page on Frontend
```
Cause: Frontend build failed or wrong environment variable
Fix:
1. Go to Vercel dashboard → Deployments
2. Check build logs for errors
3. Verify VITE_API_URL is set correctly
4. Redeploy (push new commit or click "Redeploy" button)
```

#### Issue: "Cannot reach backend" Error
```
Cause: VITE_API_URL points to wrong URL or backend is down
Fix:
1. Check Vercel environment variable is correct
2. Test backend directly: curl https://backend-url.railway.app/docs
3. Check Railway backend service is running (not crashed)
4. View Railway logs for errors
```

#### Issue: 401 Unauthorized on Login
```
Cause: Token validation failing (possible SECRET_KEY mismatch)
Fix:
1. Check SECRET_KEY is set in Railway (32+ characters)
2. Make sure SECRET_KEY hasn't changed
3. Check backend logs for JWT errors
4. Clear browser localStorage and try again
5. Restart both services
```

---

## Quick Reference: Deployment Checklist

### Before Backend Deploy
- [ ] Code pushed to GitHub
- [ ] `.env` NOT committed
- [ ] `Procfile` exists and correct
- [ ] `requirements.txt` up to date
- [ ] All API keys ready

### After Backend Deploy
- [ ] Railway database created & DATABASE_URL copied
- [ ] Environment variables added to Railway
- [ ] Backend URL obtained from Railway
- [ ] Backend responds to `/docs` endpoint

### Before Frontend Deploy
- [ ] Code pushed to GitHub
- [ ] `npm run build` works locally
- [ ] `vercel.json` exists

### After Frontend Deploy
- [ ] Frontend URL obtained from Vercel
- [ ] VITE_API_URL added to Vercel with backend URL
- [ ] Frontend loads without errors
- [ ] Frontend can reach backend

### Final Steps
- [ ] Add FRONTEND_URL to Railway backend
- [ ] CORS configured if needed
- [ ] Test complete flow: Load → Login → Navigate

---

## Environment Variables Reference

### Required for Railway Backend

```env
# Database (PROVIDED BY RAILWAY)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Security (GENERATE NEW)
SECRET_KEY=<generate-with-openssl-rand-hex-32>

# API Keys (GET FROM RESPECTIVE SERVICES)
GROQ_API_KEY=...
HUGGINGFACE_API_KEY=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Email (YOUR GMAIL ACCOUNT)
EMAIL_SENDER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# URLs (CONFIGURE AFTER DEPLOYMENT)
FRONTEND_URL=https://buildwise-frontend.vercel.app
BACKEND_URL=https://your-railway-backend.railway.app
GOOGLE_REDIRECT_URI=https://your-railway-backend.railway.app/auth/google/callback
```

### Required for Vercel Frontend

```env
VITE_API_URL=https://your-railway-backend.railway.app
```

---

## Rollback Procedures

### If Backend Deploy Fails
```
1. Go to Railway dashboard
2. Click on backend service
3. Go to "Deployments" tab
4. Find previous successful deployment
5. Click "Redeploy" on that version
6. Service rolls back immediately
```

### If Frontend Deploy Fails
```
1. Go to Vercel dashboard
2. Click on project
3. Go to "Deployments" tab
4. Find previous successful deployment
5. Click three-dots menu → "Redeploy"
6. Vercel redeploys that version
```

---

## Support & Troubleshooting

### Useful Logging Commands

**View Railway Backend Logs:**
```
1. Railway dashboard → Backend service → Logs tab
2. Select "Deployment" tab to see real-time logs
3. Search for "ERROR" or your test requests
```

**View Vercel Frontend Logs:**
```
1. Vercel dashboard → Project → Deployments
2. Click on deployment
3. View build logs or runtime logs
```

### Getting Help
- **FastAPI Docs:** `https://your-backend.railway.app/docs`
- **React DevTools:** Install React Developer Tools browser extension
- **Network Tab:** Browser DevTools → Network tab to inspect API calls
- **Console Errors:** Browser DevTools → Console to see JavaScript errors

---

## Estimated Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Railway database creation | 5 minutes |
| 2 | Backend deployment to Railway | 10 minutes |
| 3 | Configure environment variables | 5 minutes |
| 4 | Frontend deployment to Vercel | 10 minutes |
| 5 | Configure VITE_API_URL | 2 minutes |
| 6 | Testing & troubleshooting | 10-30 minutes |
| **TOTAL** | | **45-60 minutes** |

---

## Success Criteria

Deployment is **successful** when:
1. ✅ Frontend loads at Vercel URL without blank page
2. ✅ Admin login page renders
3. ✅ Successful login redirects to admin dashboard
4. ✅ Token successfully stored in localStorage
5. ✅ Admin can view pricing requests
6. ✅ No 401 errors on authenticated requests
7. ✅ FastAPI Swagger UI accessible at `/docs`

---

**Last Status Update:** Ready for Prototype Deployment  
**Next Steps:** Follow the deployment guide above step-by-step.
