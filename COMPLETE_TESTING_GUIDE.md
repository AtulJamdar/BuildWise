# Complete System Testing Guide - BuildWise Custom Pricing & Renewal System

## 🚀 QUICK START: Verify Backend is Running

### Step 1: Start the Backend Server

```powershell
# In terminal (from project root D:\Python_Project\BuildWise)
python -m uvicorn api.main:app --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Step 2: Verify Backend Started Successfully

```
curl http://localhost:8000/docs
```

Expected: Swagger UI loads successfully at `http://localhost:8000/docs`

If you see `ERR_CONNECTION_REFUSED`, the backend isn't running. Check for Python errors above.

---

## ✅ PHASE 1: Authentication Testing

### Test 1.1: User Registration

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@123456",
    "username": "testuser"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user_id": 1,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Test 1.2: User Login

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@123456"
  }'
```

Expected Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": 1
}
```

### Test 1.3: GitHub OAuth Login

Open browser and navigate to:
```
http://localhost:5173/login
```

Click "Login with GitHub" → You should be redirected to GitHub's login page

---

## ✅ PHASE 2: Admin Pricing System Testing

### Test 2.1: Admin Login

```bash
curl -X POST "http://localhost:8000/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "atuljamdar4@gmail.com",
    "password": "atul@123"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Admin login successful",
  "admin_id": 1,
  "token": "admin_token_here"
}
```

### Test 2.2: Get Pending Pricing Requests

```bash
curl -X GET "http://localhost:8000/admin/pricing-requests" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

Expected Response:
```json
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "company_name": "Tech Corp",
      "team_size": 50,
      "scans_per_month": 10000,
      "budget_min": 50000,
      "budget_max": 100000,
      "status": "pending",
      "created_at": "2024-01-15T10:30:00"
    }
  ],
  "count": 1
}
```

### Test 2.3: Approve Request & Create Custom Plan

```bash
curl -X POST "http://localhost:8000/admin/pricing-requests/1/approve" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "custom_price": 75000,
    "scans_per_month": 10000,
    "features": ["automated_fixes", "github_integration", "team_management"],
    "validity_days": 365,
    "approval_notes": "Approved for enterprise customer"
  }'
```

Expected Response:
```json
{
  "success": true,
  "plan": {
    "id": 1,
    "custom_price": 75000,
    "razorpay_order_id": "order_abc123xyz",
    "payment_link": "https://rzp.io/l/order_abc123xyz",
    "status": "pending_payment"
  },
  "message": "✅ Custom pricing plan created and payment link sent via email"
}
```

---

## ✅ PHASE 3: Customer Pricing Request Testing

### Test 3.1: Submit Pricing Request (Customer)

```bash
curl -X POST "http://localhost:8000/api/pricing-requests" \
  -H "Authorization: Bearer {USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "StartUp Inc",
    "team_size": 30,
    "scans_per_month": 5000,
    "specific_features": ["automated_fixes", "github_integration"],
    "budget_min": 40000,
    "budget_max": 80000
  }'
```

Expected Response:
```json
{
  "success": true,
  "request_id": 2,
  "message": "✅ Pricing request submitted! Check your email for confirmation."
}
```

### Test 3.2: Get My Pricing Requests

```bash
curl -X GET "http://localhost:8000/api/pricing-requests/my" \
  -H "Authorization: Bearer {USER_TOKEN}"
```

Expected Response:
```json
{
  "success": true,
  "requests": [
    {
      "id": 2,
      "company_name": "StartUp Inc",
      "status": "pending",
      "created_at": "2024-01-20T14:30:00"
    }
  ]
}
```

---

## ✅ PHASE 4: Payment & Plan Activation Testing

### Test 4.1: Simulate Razorpay Payment (Using Postman/Insomnia)

**Method:** POST  
**URL:** `http://localhost:8000/api/custom-pricing/confirm-payment`  
**Headers:**
```
Authorization: Bearer {USER_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "plan_id": 1,
  "razorpay_payment_id": "pay_test_12345"
}
```

Expected Response:
```json
{
  "success": true,
  "message": "✅ Payment confirmed! Your custom plan is now active. Confirmation email sent."
}
```

### Test 4.2: Check Plan Status

```bash
curl -X GET "http://localhost:8000/api/custom-pricing/plan/1" \
  -H "Authorization: Bearer {USER_TOKEN}"
```

Expected Response:
```json
{
  "success": true,
  "plan": {
    "id": 1,
    "custom_price": 75000,
    "scans_per_month": 10000,
    "expires_at": "2025-01-20T14:30:00",
    "payment_status": "paid",
    "status": "active"
  }
}
```

---

## ✅ PHASE 5: PLAN RENEWAL SYSTEM TESTING (NEW!)

### Test 5.1: Create Renewal Request

```bash
curl -X POST "http://localhost:8000/api/plans/1/renew" \
  -H "Authorization: Bearer {USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "renewal_days": 365
  }'
```

Expected Response:
```json
{
  "success": true,
  "renewal": {
    "renewal_id": 1,
    "plan_id": 1,
    "renewal_days": 365,
    "pro_rated_price": 72500,
    "order_id": "order_renewal_xyz",
    "payment_link": "https://rzp.io/l/order_renewal_xyz"
  },
  "message": "Renewal request created successfully"
}
```

### Test 5.2: Get User Renewals

```bash
curl -X GET "http://localhost:8000/api/renewals/my" \
  -H "Authorization: Bearer {USER_TOKEN}"
```

Expected Response:
```json
{
  "success": true,
  "renewals": [
    {
      "renewal_id": 1,
      "plan_id": 1,
      "renewal_days": 365,
      "pro_rated_price": 72500,
      "status": "pending",
      "payment_link": "https://rzp.io/l/order_renewal_xyz"
    }
  ],
  "count": 1
}
```

### Test 5.3: Get Renewal Details

```bash
curl -X GET "http://localhost:8000/api/renewals/1" \
  -H "Authorization: Bearer {USER_TOKEN}"
```

Expected Response:
```json
{
  "success": true,
  "renewal": {
    "renewal_id": 1,
    "plan_id": 1,
    "renewal_days": 365,
    "pro_rated_price": 72500,
    "status": "pending",
    "created_at": "2024-01-25T10:00:00"
  }
}
```

### Test 5.4: Confirm Renewal Payment

```bash
curl -X POST "http://localhost:8000/api/renewals/1/confirm-payment" \
  -H "Authorization: Bearer {USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_payment_id": "pay_renewal_test_xyz"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "✅ Renewal payment confirmed! Your plan has been renewed.",
  "renewal": {
    "renewal_id": 1,
    "status": "paid"
  },
  "plan_expires_at": "2025-01-25T10:00:00"
}
```

### Test 5.5: Check Renewal Payment Status

```bash
curl -X GET "http://localhost:8000/api/renewals/1/payment-status" \
  -H "Authorization: Bearer {USER_TOKEN}"
```

Expected Response:
```json
{
  "success": true,
  "renewal_id": 1,
  "status": "paid",
  "is_paid": true
}
```

### Test 5.6: Cancel Renewal (Only for pending status)

```bash
# First create a new renewal
# Then cancel it

curl -X POST "http://localhost:8000/api/renewals/2/cancel" \
  -H "Authorization: Bearer {USER_TOKEN}"
```

Expected Response:
```json
{
  "success": true,
  "message": "Renewal request cancelled",
  "renewal": {
    "renewal_id": 2,
    "status": "cancelled"
  }
}
```

---

## ✅ PHASE 6: Frontend Testing (React)

### Test 6.1: Admin Dashboard

```
http://localhost:5173/admin/login
```

**Steps:**
1. Login with: `atuljamdar4@gmail.com` / `atul@123`
2. Should see dashboard with:
   - ✅ Pending pricing requests count
   - ✅ Pending payments count
   - ✅ Recent activity list
3. Click on pending request → Should see approval form
4. Fill custom price → Should create custom plan with payment link

### Test 6.2: Customer Pricing Request Form

```
http://localhost:5173/pricing/request
```

**Steps:**
1. Fill out form with company info
2. Submit → Should see success message
3. Navigate to `/pricing/my-requests` → Should see submitted request in pending tab

### Test 6.3: Plan Renewal Page

```
http://localhost:5173/pricing/plans/renew
```

**Steps:**
1. Should see list of expiring plans (if any exist)
2. Select a plan
3. Choose renewal period (30/90/180/365 days)
4. See pro-rated price with discounts
5. Click "Proceed to Payment"
6. Razorpay modal opens
7. Complete payment (use test card in Razorpay)
8. Should see success message and redirect

### Test 6.4: Plan Analytics Page

```
http://localhost:5173/pricing/analytics
```

**Steps:**
1. Should see usage dashboard
2. Usage percentage bar
3. Scans used vs. limit
4. Days remaining until expiry
5. Charts (if implemented)

### Test 6.5: Invoices Page

```
http://localhost:5173/pricing/invoices
```

**Steps:**
1. Should see list of invoices
2. Filter by status (paid/pending/overdue)
3. See invoice details
4. Download PDF button (if implemented)

---

## ✅ PHASE 7: Email Verification

### Check Received Emails

After each action, check the configured email inbox for:

- ✅ **Pricing request confirmation** - When customer submits request
- ✅ **Admin notification** - When new request submitted
- ✅ **Approval email** - When admin approves request
- ✅ **Payment link email** - When custom plan created
- ✅ **Payment confirmation** - After successful payment
- ✅ **Renewal offer** - 7 days before plan expiry
- ✅ **Renewal confirmation** - After renewal payment
- ✅ **Expiry reminders** - 7 days, 1 day, and on expiry

---

## 🔧 TROUBLESHOOTING

### Issue: Backend won't start - "ModuleNotFoundError"

**Solution:**
```powershell
# Ensure virtual environment is activated
& d:\Python_Project\BuildWise\.venv\Scripts\Activate.ps1

# Install missing dependencies
pip install -r requirements.txt

# Try starting again
python -m uvicorn api.main:app --reload
```

### Issue: "SyntaxError" in email_service.py

**Solution:** This is now fixed! The nested f-string issue has been resolved.

### Issue: GitHub login returns "ERR_CONNECTION_REFUSED"

**Solution:**
1. ✅ Ensure backend is running (`python -m uvicorn api.main:app --reload`)
2. ✅ Check that `.env` has valid `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
3. ✅ Verify `GITHUB_REDIRECT_URI` matches GitHub app settings (should be `http://localhost:8000/auth/github/callback`)

### Issue: Razorpay payment link won't open

**Solution:**
1. ✅ Check `.env` has valid `RAZORPAY_KEY_ID` and `RAZORPAY_SECRET_KEY`
2. ✅ Use test keys from Razorpay dashboard
3. ✅ For testing, use test card: `4111 1111 1111 1111` (any future expiry, any CVV)

### Issue: Emails not sending

**Solution:**
1. ✅ Check `.env` has valid email credentials
2. ✅ Verify SMTP server and port settings
3. ✅ For Gmail: Enable "Less secure app access" OR use an App Password
4. ✅ Check email service logs: `tail -f logs/email.log`

---

## 📊 COMPLETE WORKFLOW TEST (End-to-End)

Follow this sequence to test the entire system:

### Step 1: Setup
```
1. Start backend: python -m uvicorn api.main:app --reload
2. Start frontend: npm run dev (from buildwise-frontend directory)
3. Open http://localhost:5173
```

### Step 2: Customer Journey
```
1. Register new user account
2. Login with email/password
3. Submit pricing request
4. Check email for confirmation
```

### Step 3: Admin Journey
```
1. Login as admin (atuljamdar4@gmail.com / atul@123)
2. See new pricing request
3. Approve with custom price
4. Review approval email sent to customer
```

### Step 4: Payment Journey
```
1. Login as customer
2. Receive payment link email
3. Click payment link or navigate to plan details
4. Complete Razorpay payment (test card)
5. See success message
6. Check confirmation email
```

### Step 5: Renewal Journey (NEW!)
```
1. Navigate to /pricing/plans/renew
2. Select active plan (if exists)
3. Choose renewal period
4. Review pro-rated pricing
5. Complete Razorpay payment
6. See plan expiry extended
7. Check renewal confirmation email
```

---

## ✅ SUCCESS INDICATORS

You'll know everything is working when you see:

- ✅ Admin dashboard loads with metrics
- ✅ Pricing request form submits successfully
- ✅ Admin can approve requests and create plans
- ✅ Customer receives payment link email
- ✅ Razorpay payment modal opens and closes
- ✅ Plan status shows "active" after payment
- ✅ Renewal page displays expiring plans
- ✅ Pro-rated pricing calculated correctly
- ✅ Plan expiry extended after renewal payment
- ✅ All emails received with correct content

---

## 📝 TEST DATA FOR QUICK TESTING

### Test User 1 (Customer)
```
Email: customer@test.com
Password: Test@123456
```

### Test User 2 (Admin)
```
Email: atuljamdar4@gmail.com
Password: atul@123
```

### Test Razorpay Card (Test Mode)
```
Card: 4111 1111 1111 1111
Expiry: 12/25
CVV: 123
```

---

**Status:** All functionality implemented and ready for testing!  
**Last Updated:** 2024-04-25  
**Version:** 1.0 Complete System
