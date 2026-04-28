# BuildWise Deployment - Quick Start Guide
## 5-Step Deployment in 1 Hour

**Total Time:** ~45 minutes  
**Prerequisites:** GitHub account, Railway account, Vercel account

---

## STEP 1: Create Railway Database (5 min)

```
1. Go to railway.app → Sign in
2. Click "New Project" → "Database" → "PostgreSQL"
3. Wait for database to initialize
4. Click PostgreSQL box → "Connect" tab
5. COPY: The "DATABASE_URL" value (looks like postgresql://user:pass@host/db)
6. SAVE this URL - you'll need it in Step 2
```

**Result:** DATABASE_URL ready ✓

---

## STEP 2: Deploy Backend to Railway (10 min)

```
1. Go to railway.app dashboard
2. Click "+" → "GitHub Repo"
3. Select your BuildWise repository
4. Select branch: main
5. Click "Deploy"
6. Wait for build to complete (shows green checkmark)
7. Click on service → "Settings" → Find "Domains" section
8. COPY: Your backend URL (looks like https://buildwise-backend.railway.app)
9. SAVE this URL - you'll need it in Step 4
```

**Add Environment Variables to Railway:**

While backend is building, in Railway dashboard:
1. Click your backend service → "Variables" tab
2. Add each of these (click "+ Add Variable" for each):

| Name | Value |
|------|-------|
| `DATABASE_URL` | Paste from Step 1 |
| `SECRET_KEY` | Generate: `openssl rand -hex 32` (copy output) |
| `GROQ_API_KEY` | Your Groq API key |
| `HUGGINGFACE_API_KEY` | Your HF token |
| `GITHUB_CLIENT_ID` | GitHub OAuth ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret |
| `GOOGLE_CLIENT_ID` | Google OAuth ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `RAZORPAY_KEY_ID` | Razorpay key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `EMAIL_SENDER` | your-email@gmail.com |
| `EMAIL_PASSWORD` | Gmail app password |
| `BACKEND_URL` | Your backend URL from step 8 above |

**Result:** Backend running at your Railway URL ✓

---

## STEP 3: Deploy Frontend to Vercel (10 min)

```
1. Go to vercel.com → Sign in
2. Click "Add New" → "Project"
3. Select your BuildWise GitHub repository
4. Click "Import"
```

**Configure Build Settings:**
```
1. Project Name: buildwise-frontend
2. Framework: Vite (auto-selected)
3. Root Directory: buildwise-frontend
4. Build Command: npm run build (pre-filled)
5. Output Directory: dist (pre-filled)
```

**Add Environment Variable:**
```
1. Click "Environment Variables"
2. Name: VITE_API_URL
3. Value: Paste your Railway backend URL from Step 2
4. Make it available for: Production
5. Click "Deploy"
6. Wait for build (shows blue "Vercel" badge when done)
7. You'll see "Congratulations! Your project is live"
8. COPY: Your frontend URL (looks like https://buildwise-frontend.vercel.app)
9. SAVE this URL
```

**Result:** Frontend running at your Vercel URL ✓

---

## STEP 4: Update Backend with Frontend URL (2 min)

Back in Railway:
```
1. Go to Railway dashboard → Your backend service
2. Click "Variables" tab
3. Find or add: FRONTEND_URL
4. Set value to your Vercel URL from Step 3
5. Save (service auto-restarts)
```

**Result:** Backend and frontend connected ✓

---

## STEP 5: Test the Deployment (5-10 min)

**Test 1: Frontend loads**
```
1. Open your Vercel URL: https://buildwise-frontend.vercel.app
2. Page should load (not blank)
✓ If yes: Continue
✗ If blank: Check Vercel build logs
```

**Test 2: Navigate to admin login**
```
1. In the app, go to /admin/login
2. Login form should appear
✓ If yes: Continue
✗ If error: Check browser console (F12)
```

**Test 3: Try admin login**
```
1. Enter admin username and password
2. Click "Login"
3. Should redirect to dashboard or show error
✓ If success: All done!
✗ If 401 error: Check browser console and Railway backend logs
```

**Test 4: Check API connectivity**
```bash
# In terminal, test backend is responding:
curl https://your-railway-backend.railway.app/docs

# Should show FastAPI Swagger UI (long HTML response)
✓ If yes: Backend working
✗ If error: Backend might be crashed, check Railway logs
```

---

## If Something Goes Wrong

### Frontend shows blank page
```
1. Go to Vercel → Deployments tab
2. Click on your deployment
3. Check "Build Logs" for errors
4. Most common: VITE_API_URL not set correctly
5. Fix: Update variable, click "Redeploy"
```

### "Cannot reach backend" or API errors
```
1. Verify VITE_API_URL is correct in Vercel
2. Test backend directly: curl https://backend-url.railway.app/docs
3. If curl fails: Backend crashed, check Railway logs
4. If curl works: Check browser Network tab for request details
```

### 401 Unauthorized on login
```
1. Check Railway backend logs for JWT errors
2. Make sure SECRET_KEY is 32+ characters
3. Restart services (redeploy Railway backend)
4. Clear browser localStorage and try again
```

---

## Deployment Complete!

When everything is working:

- **Frontend:** `https://buildwise-frontend.vercel.app` ✓
- **Backend:** `https://your-railway-backend.railway.app` ✓
- **Database:** Railway PostgreSQL ✓
- **Admin Login:** Working ✓
- **API:** Responding to requests ✓

---

## URLs to Save

Keep these for reference:

| Name | URL |
|------|-----|
| Frontend | https://buildwise-frontend.vercel.app |
| Backend | https://your-railway-backend.railway.app |
| Backend API Docs | https://your-railway-backend.railway.app/docs |
| Railway Dashboard | https://railway.app |
| Vercel Dashboard | https://vercel.com |

---

## Common Commands

**Check backend status:**
```bash
curl https://your-railway-backend.railway.app/docs
```

**Test admin login:**
```bash
curl -X POST https://your-railway-backend.railway.app/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

**Redeploy Railway (if needed):**
```
Go to Railway → Backend service → "Deploy" tab → "Trigger Deploy"
```

**Redeploy Vercel (if needed):**
```
Go to Vercel → Project → "Deployments" → three-dots menu → "Redeploy"
```

---

**Need more details?** See `DEPLOYMENT_GUIDE.md` for comprehensive instructions with troubleshooting.
