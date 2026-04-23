# BuildWise Deployment Guide

This guide covers deploying BuildWise frontend on **Vercel** and backend on **Railway**.

## Prerequisites

- Git repository with all code pushed
- Vercel account (https://vercel.com)
- Railway account (https://railway.app)
- PostgreSQL database (or use Railway's PostgreSQL)
- All API keys and secrets ready

## Backend Deployment (Railway)

### Step 1: Prepare Railway PostgreSQL Database

1. Log in to Railway.app
2. Create a new project
3. Add PostgreSQL database
4. Note the connection details:
   - Host
   - Port (usually 5432)
   - Database name
   - Username
   - Password

### Step 2: Set Up Backend on Railway

1. In your Railway project, add a new service
2. Select "GitHub" and connect your BuildWise repository
3. Configure the deployment:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Configure Environment Variables on Railway

Go to Variables tab and add:

```
# Database
DB_HOST=<your-railway-db-host>
DB_PORT=5432
DB_NAME=<database-name>
DB_USER=postgres
DB_PASSWORD=<your-railway-db-password>

# API Keys
SECRET_KEY=<generate-a-32-char-random-string>
GROQ_API_KEY=<your-groq-api-key>
HUGGINGFACE_API_KEY=<your-huggingface-key>

# OAuth
GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_REDIRECT_URI=https://<your-railway-domain>/auth/google/callback

# Payment
RAZORPAY_KEY_ID=<razorpay-key-id>
RAZORPAY_KEY_SECRET=<razorpay-key-secret>

# Email
EMAIL_SENDER=<your-email@gmail.com>
EMAIL_PASSWORD=<gmail-app-password-or-sendgrid-key>
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587

# URLs
FRONTEND_URL=https://<your-vercel-deployment>.vercel.app
BACKEND_URL=https://<your-railway-domain>
```

### Step 4: Run Database Migrations

After deployment, run the migration command in Railway:

```bash
python -m alembic upgrade head
```

Or manually create the business_inquiries table:

```sql
CREATE TABLE IF NOT EXISTS business_inquiries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    team_size VARCHAR(100),
    requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_business_inquiries_user_id ON business_inquiries(user_id);
```

### Step 5: Verify Backend Deployment

Visit: `https://<your-railway-domain>/docs` to see API documentation

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Vercel

The frontend is already configured with `vercel.json`. No additional changes needed.

### Step 2: Connect Frontend to Vercel

1. Log in to Vercel
2. Click "Add New Project"
3. Select your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `buildwise-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Set Environment Variables on Vercel

In Vercel project settings, add environment variable:

```
VITE_API_URL=https://<your-railway-domain>
```

This tells the frontend where to find the backend API.

### Step 4: Deploy

Click "Deploy" and wait for the build to complete.

## Frontend Configuration for Production

### Using API URL in Components

The frontend is already configured to use the backend API. Verify in your app:

```javascript
// Frontend uses http://localhost:8000 in development
// And VITE_API_URL environment variable in production
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

Update files if needed (usually in `src/main.jsx` or API service file):

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

## Post-Deployment Checklist

### Backend (Railway)
- [ ] Database is running and accessible
- [ ] Environment variables are set
- [ ] Business inquiries table is created
- [ ] API docs accessible at `/docs`
- [ ] Health check working at `/health` or similar endpoint

### Frontend (Vercel)
- [ ] Build successful with no errors
- [ ] VITE_API_URL environment variable set
- [ ] Frontend loads without CORS errors
- [ ] Can login/register successfully
- [ ] Can scan repositories
- [ ] Business inquiry form works

## Testing Deployment

### Backend Tests

```bash
# Test health endpoint
curl https://<your-railway-domain>/health

# Test API docs
https://<your-railway-domain>/docs
```

### Frontend Tests

1. Navigate to frontend URL in browser
2. Try logging in with GitHub OAuth
3. Try registering a new account
4. Submit business inquiry form
5. Perform a repository scan

## Troubleshooting

### CORS Errors

If frontend can't reach backend:

1. Check `FRONTEND_URL` is set correctly in backend env
2. Verify CORS is enabled in `api/main.py`:

```python
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Database Connection Error

1. Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` are correct
2. Ensure Railway database is running
3. Check network access is allowed

### OAuth Redirect URI Mismatch

1. Update OAuth app settings with correct redirect URIs:
   - **GitHub**: `https://<your-railway-domain>/auth/github/callback`
   - **Google**: `https://<your-railway-domain>/auth/google/callback`

### Email Not Sending

1. Verify `EMAIL_SENDER` and `EMAIL_PASSWORD` (Gmail app password)
2. Ensure SMTP settings are correct
3. Check email logs in Railway

## Environment Variables Summary

### Backend Required Variables

```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
SECRET_KEY
GROQ_API_KEY, HUGGINGFACE_API_KEY
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
EMAIL_SENDER, EMAIL_PASSWORD
FRONTEND_URL, BACKEND_URL
```

### Frontend Required Variables

```
VITE_API_URL (set in Vercel environment)
```

## Support

For issues:
1. Check Railway logs: Railway Dashboard → Logs
2. Check Vercel logs: Vercel Dashboard → Deployments → Logs
3. Verify all environment variables are set
4. Ensure database migrations have run

Happy deploying! 🚀
