# Railway Deployment Configuration

## Environment Variable Template

Copy and paste these into Railway dashboard → Variables:

```
# PostgreSQL Database (from Railway PostgreSQL service)
DB_HOST=$DATABASE_PRIVATE_URL_PARSED_HOST
DB_PORT=$DATABASE_PRIVATE_URL_PARSED_PORT
DB_NAME=$DATABASE_PRIVATE_URL_PARSED_DATABASE
DB_USER=$DATABASE_PRIVATE_URL_PARSED_USER
DB_PASSWORD=$DATABASE_PRIVATE_URL_PARSED_PASSWORD

# Application
SECRET_KEY=your_32_character_secret_key_here_min_32_chars
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
# TODO: replace hardcoded value with environment variable GITHUB_CLIENT_SECRET

# Google OAuth  
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://[railway-domain]/auth/google/callback

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email Configuration
EMAIL_SENDER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587

# URLs
FRONTEND_URL=https://[your-vercel-url].vercel.app
BACKEND_URL=https://[railway-domain]
```

## Railway Setup Steps

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click "Create New Project"
3. Select "GitHub" and connect your repository

### Step 2: Add PostgreSQL Database

1. Click "Add Service" → "Database" → "PostgreSQL"
2. Railway will automatically create the database
3. Environment variables will be auto-populated with `$DATABASE_*` variables

### Step 3: Configure Backend Service

In your Railway project, find the service connected to your GitHub repo:

1. Set **Build Command**: `pip install -r requirements.txt`
2. Set **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
3. The `PORT` variable is automatically provided by Railway

### Step 4: Add Environment Variables

Go to Variables tab and paste the template above, replacing values with your secrets.

### Step 5: Deploy

- Railway will automatically deploy on GitHub push
- Or manually trigger a deploy from the Railway dashboard

## Railway PostgreSQL Variables

When you add PostgreSQL to Railway, these variables are automatically available:

- `$DATABASE_URL` - Full connection string
- `$DATABASE_PRIVATE_URL` - Private connection string
- `$DATABASE_PRIVATE_URL_PARSED_HOST` - Host
- `$DATABASE_PRIVATE_URL_PARSED_PORT` - Port
- `$DATABASE_PRIVATE_URL_PARSED_DATABASE` - Database name
- `$DATABASE_PRIVATE_URL_PARSED_USER` - Username
- `$DATABASE_PRIVATE_URL_PARSED_PASSWORD` - Password

## Running Database Migrations

After deployment, run migrations in Railway shell:

1. Go to Railway Dashboard
2. Click on your deployed service
3. Go to "Shell" tab
4. Run:
```bash
python -m alembic upgrade head
```

Or manually create the business_inquiries table:

```bash
psql $DATABASE_URL -c "
CREATE TABLE IF NOT EXISTS business_inquiries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    team_size VARCHAR(100),
    requirements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_business_inquiries_user_id ON business_inquiries(user_id);
"
```

## Logs and Debugging

### View Logs

1. Click your deployed service in Railway
2. Go to "Deployments" tab
3. Click the active deployment
4. View build and runtime logs

### Common Issues

**Port Error:**
- Solution: Use `$PORT` environment variable (Procfile already does this)

**Database Connection Error:**
- Check: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD are correct
- Verify: PostgreSQL service is running in same project

**Module Not Found:**
- Solution: Ensure all imports are in `requirements.txt`
- Run: `pip freeze > requirements.txt` locally to update

**API Endpoint Not Responding:**
- Check: Backend service is deployed and running
- Verify: CORS is configured with correct FRONTEND_URL
- Test: `https://[domain]/docs` returns Swagger UI

## Domain Configuration

Railway automatically assigns a domain like: `https://buildwise-backend-production.up.railway.app`

To use a custom domain:
1. Go to Railway service settings
2. Add custom domain
3. Configure DNS with your domain provider
4. Update `BACKEND_URL` in Vercel environment variables

## Scaling

Railway has built-in scaling options:

- **Vertical Scaling:** Increase CPU/Memory in service settings
- **Auto-scaling:** Enable based on metrics (requires higher tier)

For starting out, the default configuration should be sufficient.

## Cost Estimation

Railway pricing is based on usage:
- PostgreSQL: ~$5-10/month for starter databases
- Compute: ~$5/month for minimal backend
- Total: ~$10-15/month to start

Check https://railway.app/pricing for current rates.

## Monitoring

Enable Railway Monitoring to track:
- API response times
- Error rates
- Database queries
- CPU/Memory usage

Go to your service → Metrics tab

---

**Ready to deploy on Railway!** 🚀