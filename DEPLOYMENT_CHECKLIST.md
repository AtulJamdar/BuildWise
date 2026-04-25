# 📋 DEPLOYMENT CHECKLIST - Custom Pricing Backend

## ✅ Pre-Deployment Verification

### Code Quality
- ✅ All Python files have correct syntax
- ✅ All imports are correct
- ✅ No circular dependencies
- ✅ Service modules tested and importable
- ✅ API endpoints defined

### Security
- ✅ No hardcoded passwords in code
- ✅ Bcrypt password hashing implemented
- ✅ JWT token authentication in place
- ✅ Role-based access control configured
- ✅ Input validation on all endpoints
- ✅ Admin endpoints protected with role checks

### Database
- ✅ SQL schemas created (2 new tables)
- ✅ Foreign keys configured
- ✅ Indexes defined for performance
- ✅ Default values set appropriately
- ✅ Timestamps for audit trail

### Documentation
- ✅ Complete implementation summary
- ✅ API endpoints reference
- ✅ Design analysis documentation
- ✅ Security documentation
- ✅ Quick start guide

---

## 🚀 Deployment Steps

### Phase 1: Database Setup (30 minutes)

#### Step 1.1: Create Pricing Requests Table
```bash
cd d:\Python_Project\BuildWise
psql -U postgres -d buildwise -f db/create_pricing_requests_table.sql
```

**Verification:**
```bash
psql -U postgres -d buildwise -c "\d pricing_requests"
# Should show table with columns: id, user_id, company_name, etc.
```

#### Step 1.2: Create Custom Pricing Plans Table
```bash
psql -U postgres -d buildwise -f db/create_custom_pricing_plans_table.sql
```

**Verification:**
```bash
psql -U postgres -d buildwise -c "\d custom_pricing_plans"
# Should show table with columns: id, pricing_request_id, user_id, etc.
```

#### Step 1.3: Verify Foreign Keys
```bash
psql -U postgres -d buildwise -c """
  SELECT constraint_name, table_name, column_name 
  FROM information_schema.constraint_column_usage 
  WHERE table_name IN ('pricing_requests', 'custom_pricing_plans');
"""
```

**Expected Output:**
- pricing_requests.user_id → users.id
- custom_pricing_plans.user_id → users.id
- custom_pricing_plans.pricing_request_id → pricing_requests.id

---

### Phase 2: Environment Setup (15 minutes)

#### Step 2.1: Add Environment Variables to .env
```bash
# Open .env and add these lines:

# Custom Pricing Admin Credentials
ADMIN_EMAIL=atuljamdar4@gmail.com
ADMIN_PASSWORD=atul@123
ENVIRONMENT=development

# Razorpay Credentials (if not already present)
RAZORPAY_KEY_ID=your_test_key_id_here
RAZORPAY_KEY_SECRET=your_test_key_secret_here
```

#### Step 2.2: Verify Environment Variables
```bash
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('ADMIN_EMAIL:', os.getenv('ADMIN_EMAIL'))"
```

**Expected Output:**
```
ADMIN_EMAIL: atuljamdar4@gmail.com
```

---

### Phase 3: Code Deployment (20 minutes)

#### Step 3.1: Verify All Files Present
```bash
ls -la core/pricing_request_service.py
ls -la core/custom_pricing_service.py
ls -la core/admin_service.py
ls -la db/create_pricing_requests_table.sql
ls -la db/create_custom_pricing_plans_table.sql
```

**Expected Output:**
All files should exist and be readable.

#### Step 3.2: Test Service Imports
```bash
python -c "from core.pricing_request_service import *; print('✅ pricing_request_service imported')"
python -c "from core.custom_pricing_service import *; print('✅ custom_pricing_service imported')"
python -c "from core.admin_service import *; print('✅ admin_service imported')"
```

#### Step 3.3: Check API Main File
```bash
python -c "from api.main import app; print('✅ Main API app imports successfully'); print('Routes:', len([r.path for r in app.routes if 'admin' in r.path or 'pricing' in r.path]))"
```

**Expected Output:**
```
✅ Main API app imports successfully
Routes: 20  (approximately, depends on other routes)
```

---

### Phase 4: Startup Test (10 minutes)

#### Step 4.1: Start Backend Server
```bash
python -m uvicorn api.main:app --reload --port 8000
```

**Expected Console Output:**
```
✅ Default admin created: atuljamdar4@gmail.com
Uvicorn running on http://127.0.0.1:8000
```

#### Step 4.2: Test Admin Login
```bash
curl -X POST http://localhost:8000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "atuljamdar4@gmail.com", "password": "atul@123"}' \
  | python -m json.tool
```

**Expected Response:**
```json
{
  "success": true,
  "access_token": "eyJ0eXAiOiJKV1QiLC...",
  "token_type": "bearer",
  "admin_id": 1,
  "admin_name": "BuildWise Admin",
  "role": "admin"
}
```

#### Step 4.3: Verify Database Connection
Check server logs for:
```
✅ Custom pricing infrastructure ready
```

---

### Phase 5: Functional Testing (20 minutes)

#### Test 5.1: Admin Authentication
```bash
ADMIN_TOKEN="<paste token from step 4.2>"

# Try to access admin endpoint
curl -X GET http://localhost:8000/admin/api/pricing-requests \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python -m json.tool
```

**Expected Response:**
```json
{
  "success": true,
  "requests": [],
  "count": 0
}
```

#### Test 5.2: Create Pricing Request (Requires User Token)
```bash
USER_TOKEN="<get from user login>"

curl -X POST http://localhost:8000/api/custom-pricing/request \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Corp",
    "team_size": 25,
    "scans_per_month": 500,
    "specific_features": "API access, Custom dashboards",
    "budget_min": 25000,
    "budget_max": 40000
  }' | python -m json.tool
```

**Expected Response:**
```json
{
  "success": true,
  "request_id": 1,
  "message": "✅ Pricing request submitted successfully..."
}
```

#### Test 5.3: Admin Retrieves Request
```bash
ADMIN_TOKEN="<paste token>"

curl -X GET http://localhost:8000/admin/api/pricing-requests/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python -m json.tool
```

**Expected Response:**
Shows the request with all details (company_name, budget, features, etc.)

#### Test 5.4: Admin Approves Request
```bash
ADMIN_TOKEN="<paste token>"

curl -X POST http://localhost:8000/admin/api/pricing-requests/1/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "custom_price": 30000,
    "scans_per_month": 500,
    "features": ["API access", "Custom dashboards", "Priority support"],
    "validity_days": 365,
    "approval_notes": "Approved for test customer"
  }' | python -m json.tool
```

**Expected Response:**
```json
{
  "success": true,
  "plan_id": 1,
  "message": "✅ Pricing approved. Custom plan created..."
}
```

---

### Phase 6: Database Verification (10 minutes)

#### Verify Data Insertion
```bash
psql -U postgres -d buildwise -c "SELECT id, company_name, status FROM pricing_requests;"
```

**Expected Output:**
```
 id | company_name | status
----+--------------+---------
  1 | Test Corp    | approved
```

```bash
psql -U postgres -d buildwise -c "SELECT id, custom_price, payment_status FROM custom_pricing_plans;"
```

**Expected Output:**
```
 id | custom_price | payment_status
----+--------------+----------------
  1 |        30000 | pending
```

---

### Phase 7: Error Handling Tests (10 minutes)

#### Test 7.1: Missing Authentication
```bash
curl -X POST http://localhost:8000/api/custom-pricing/request \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Test"}'
```

**Expected Response:** 403 Unauthorized

#### Test 7.2: Invalid Admin Password
```bash
curl -X POST http://localhost:8000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "atuljamdar4@gmail.com", "password": "wrong"}'
```

**Expected Response:**
```json
{"detail": "Invalid password"}
```

#### Test 7.3: Non-Admin Access to Admin Endpoint
```bash
curl -X GET http://localhost:8000/admin/api/pricing-requests \
  -H "Authorization: Bearer <user_token>"
```

**Expected Response:** 403 Forbidden with "Admin access required"

#### Test 7.4: Unauthorized User Viewing Other's Request
```bash
curl -X GET http://localhost:8000/api/custom-pricing/request/1 \
  -H "Authorization: Bearer <different_user_token>"
```

**Expected Response:** 403 Forbidden with "Unauthorized access"

---

## ✅ Final Verification Checklist

### Code & Database
- [ ] All 5 Python service files created
- [ ] Both SQL schema files created
- [ ] main.py updated with endpoints and imports
- [ ] Database tables created successfully
- [ ] Foreign keys verified
- [ ] Indexes created

### Security
- [ ] Admin created automatically on startup
- [ ] Admin login works with correct credentials
- [ ] Admin login fails with wrong password
- [ ] Non-admin cannot access admin endpoints
- [ ] Users cannot access other users' data

### API Endpoints
- [ ] 20+ endpoints operational
- [ ] All endpoints respond correctly
- [ ] Authentication required on protected routes
- [ ] Error responses are proper

### Data Flow
- [ ] Customer can submit pricing request
- [ ] Admin can view pending requests
- [ ] Admin can approve requests
- [ ] Pricing plan created after approval
- [ ] Data persists in database

---

## 📊 Post-Deployment Status

### Services Running
- ✅ FastAPI server
- ✅ PostgreSQL database
- ✅ All service modules
- ✅ All API endpoints

### Data Flow Active
- ✅ Customer → Request submission
- ✅ Admin → Request review
- ✅ Admin → Pricing creation
- ✅ Data → Database storage
- ✅ Database → API responses

### Next Steps After Deployment
1. ⏭️ Step 2: Email notifications
2. ⏭️ Step 3: Admin frontend pages
3. ⏭️ Step 4: Customer pricing form
4. ⏭️ Step 5: Plan upgrade logic

---

## 🚨 Troubleshooting

### Issue: Database tables not found
**Solution:**
```bash
# Verify tables exist
psql -U postgres -d buildwise -c "\dt pricing_requests"
psql -U postgres -d buildwise -c "\dt custom_pricing_plans"

# If not, run creation scripts
psql -U postgres -d buildwise -f db/create_pricing_requests_table.sql
psql -U postgres -d buildwise -f db/create_custom_pricing_plans_table.sql
```

### Issue: Admin login returns "Admin not found"
**Solution:**
```bash
# Verify environment variables
echo $ADMIN_EMAIL
echo $ADMIN_PASSWORD

# Restart server to trigger admin creation
python -m uvicorn api.main:app --reload

# Check console for "✅ Default admin created" message
```

### Issue: Imports fail "ModuleNotFoundError"
**Solution:**
```bash
# Verify files exist
ls -la core/pricing_request_service.py
ls -la core/custom_pricing_service.py
ls -la core/admin_service.py

# Check for syntax errors
python -m py_compile core/pricing_request_service.py
```

### Issue: Database connection error
**Solution:**
```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check .env database credentials
grep DB_ .env
```

---

## 🎉 Deployment Complete!

Once all checks pass, custom pricing backend infrastructure is **READY FOR PRODUCTION USE**.

Next phase: Build frontend components.

---

**Deployment Date:** ___________________

**Deployed By:** ___________________

**Status:** [ ] Ready for Production

