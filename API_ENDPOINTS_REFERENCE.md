# 🔌 Custom Pricing API - Quick Reference Guide

## 🔐 Admin Authentication

### Admin Login
```
POST /auth/admin/login

Request:
{
  "email": "atuljamdar4@gmail.com",
  "password": "atul@123"
}

Response (Success):
{
  "success": true,
  "access_token": "eyJ0eXAiOiJKV1QiLC...",
  "token_type": "bearer",
  "admin_id": 1,
  "admin_name": "BuildWise Admin",
  "role": "admin"
}

Response (Failure):
{
  "success": false,
  "detail": "Invalid password"
}
```

---

## 👥 Customer Pricing Requests

### Submit Custom Pricing Request
```
POST /api/custom-pricing/request
Authorization: Bearer <user_token>

Request:
{
  "company_name": "TechCorp Inc",
  "team_size": 50,
  "scans_per_month": 1000,
  "specific_features": "Custom dashboards, API access, Priority support",
  "budget_min": 50000,
  "budget_max": 75000
}

Response (Success):
{
  "success": true,
  "request_id": 1,
  "message": "✅ Pricing request submitted successfully. Admin will review it soon."
}

Response (Failure):
{
  "detail": "Company name is required"
}
```

### View My Pricing Requests
```
GET /api/custom-pricing/my-requests
Authorization: Bearer <user_token>

Response:
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "company_name": "TechCorp Inc",
      "team_size": 50,
      "scans_per_month": 1000,
      "specific_features": "...",
      "budget_min": 50000.00,
      "budget_max": 75000.00,
      "status": "pending",
      "created_at": "2026-04-24T10:30:00"
    }
  ],
  "count": 1
}
```

### View Specific Pricing Request
```
GET /api/custom-pricing/request/1
Authorization: Bearer <user_or_admin_token>

Response:
{
  "success": true,
  "request": {
    "id": 1,
    "user_id": 5,
    "company_name": "TechCorp Inc",
    "team_size": 50,
    "scans_per_month": 1000,
    "specific_features": "...",
    "budget_min": 50000.00,
    "budget_max": 75000.00,
    "status": "pending",
    "created_at": "2026-04-24T10:30:00",
    "admin_notes": null,
    "reviewed_by": null,
    "reviewed_at": null,
    "customer_email": "customer@techcorp.com",
    "customer_name": "John Doe"
  }
}
```

---

## 👨‍💼 Admin - Pricing Requests Management

### View All Pending Requests (Admin)
```
GET /admin/api/pricing-requests
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "user_id": 5,
      "company_name": "TechCorp Inc",
      "team_size": 50,
      "scans_per_month": 1000,
      "specific_features": "...",
      "budget_min": 50000.00,
      "budget_max": 75000.00,
      "status": "pending",
      "created_at": "2026-04-24T10:30:00",
      "customer_email": "customer@techcorp.com",
      "customer_name": "John Doe"
    }
  ],
  "count": 1
}
```

### View Request Details (Admin)
```
GET /admin/api/pricing-requests/1
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "request": {
    "id": 1,
    "user_id": 5,
    "company_name": "TechCorp Inc",
    "team_size": 50,
    "scans_per_month": 1000,
    "specific_features": "Custom dashboards, API access",
    "budget_min": 50000.00,
    "budget_max": 75000.00,
    "status": "pending",
    "created_at": "2026-04-24T10:30:00",
    "admin_notes": null,
    "reviewed_by": null,
    "reviewed_at": null,
    "customer_email": "customer@techcorp.com",
    "customer_name": "John Doe"
  }
}
```

### Approve Pricing Request (Admin)
```
POST /admin/api/pricing-requests/1/approve
Authorization: Bearer <admin_token>

Request:
{
  "custom_price": 60000,
  "scans_per_month": 1000,
  "features": [
    "API access",
    "Custom dashboards",
    "Priority support",
    "Dedicated account manager"
  ],
  "validity_days": 365,
  "approval_notes": "Approved for enterprise customer. Negotiated discount applied."
}

Response:
{
  "success": true,
  "plan_id": 1,
  "message": "✅ Pricing approved. Custom plan created. Next: Create Razorpay payment link"
}
```

### Reject Pricing Request (Admin)
```
POST /admin/api/pricing-requests/1/reject
Authorization: Bearer <admin_token>

Request:
{
  "admin_notes": "Budget exceeds our pricing model. Suggest standard enterprise plan instead."
}

Response:
{
  "success": true,
  "message": "✅ Pricing request rejected"
}
```

---

## 💳 Custom Pricing Plans & Payment

### View Custom Plan Details
```
GET /api/custom-pricing/plan/1
Authorization: Bearer <user_token>

Response:
{
  "success": true,
  "plan": {
    "id": 1,
    "pricing_request_id": 1,
    "user_id": 5,
    "custom_price": 60000.00,
    "scans_per_month": 1000,
    "features": [
      "API access",
      "Custom dashboards",
      "Priority support"
    ],
    "validity_days": 365,
    "payment_status": "pending",
    "razorpay_order_id": null,
    "razorpay_payment_id": null,
    "payment_link": null,
    "created_at": "2026-04-24T10:35:00",
    "updated_at": "2026-04-24T10:35:00",
    "expires_at": "2027-04-24T10:35:00",
    "approved_by": 1,
    "approval_notes": "Approved for enterprise customer"
  }
}
```

### Create Razorpay Order (Admin)
```
POST /admin/api/pricing-plans/1/create-razorpay-order
Authorization: Bearer <admin_token>

Request: (No body needed)

Response:
{
  "success": true,
  "order_id": "order_IgwDjJnA1HxfFd",
  "payment_link": "http://localhost:8000/api/checkout/custom-plan/1?order_id=order_IgwDjJnA1HxfFd",
  "amount": 60000.00,
  "message": "✅ Razorpay order created. Share payment link with customer: http://..."
}
```

### View Pending Payments (Admin)
```
GET /admin/api/pending-payments
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "pending_plans": [
    {
      "id": 1,
      "user_id": 5,
      "custom_price": 60000.00,
      "scans_per_month": 1000,
      "payment_status": "pending",
      "created_at": "2026-04-24T10:35:00",
      "customer_email": "customer@techcorp.com",
      "customer_name": "John Doe",
      "company_name": "TechCorp Inc"
    }
  ],
  "count": 1
}
```

### Confirm Payment (Customer)
```
POST /api/custom-pricing/confirm-payment
Authorization: Bearer <user_token>

Request:
{
  "plan_id": 1,
  "razorpay_payment_id": "pay_IgwDjJnA1HxfFd"
}

Response:
{
  "success": true,
  "message": "✅ Payment confirmed! Your custom plan is now active."
}
```

---

## 🔗 Complete Workflow Example

### 1. Customer Submits Request
```bash
curl -X POST http://localhost:8000/api/custom-pricing/request \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1Q..." \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "TechCorp Inc",
    "team_size": 50,
    "scans_per_month": 1000,
    "specific_features": "API access, Custom dashboards",
    "budget_min": 50000,
    "budget_max": 75000
  }'
```
**Response:** `request_id: 1`

---

### 2. Admin Reviews Request
```bash
curl -X GET http://localhost:8000/admin/api/pricing-requests/1 \
  -H "Authorization: Bearer <admin_token>"
```
**Shows:** Request details, customer info, requirements

---

### 3. Admin Approves & Creates Plan
```bash
curl -X POST http://localhost:8000/admin/api/pricing-requests/1/approve \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "custom_price": 60000,
    "scans_per_month": 1000,
    "features": ["API access", "Custom dashboards", "Priority support"],
    "validity_days": 365,
    "approval_notes": "Approved for enterprise"
  }'
```
**Response:** `plan_id: 1`

---

### 4. Admin Creates Payment Order
```bash
curl -X POST http://localhost:8000/admin/api/pricing-plans/1/create-razorpay-order \
  -H "Authorization: Bearer <admin_token>"
```
**Response:** `payment_link: http://...` (Admin shares this with customer)

---

### 5. Customer Pays via Link
Customer clicks the payment link and completes payment on Razorpay

---

### 6. Customer Confirms Payment
```bash
curl -X POST http://localhost:8000/api/custom-pricing/confirm-payment \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": 1,
    "razorpay_payment_id": "pay_IgwDjJnA1HxfFd"
  }'
```
**Response:** Payment confirmed, plan is now active

---

## 🛡️ Authorization Requirements

| Endpoint | Auth Required | Role Required | Notes |
|----------|---------------|---------------|-------|
| `POST /auth/admin/login` | ❌ No | - | Public endpoint |
| `POST /api/custom-pricing/request` | ✅ Yes | user | User owns request |
| `GET /api/custom-pricing/my-requests` | ✅ Yes | user | User's own requests |
| `GET /api/custom-pricing/request/{id}` | ✅ Yes | user/admin | User or admin |
| `GET /admin/api/pricing-requests` | ✅ Yes | admin | Admin only |
| `GET /admin/api/pricing-requests/{id}` | ✅ Yes | admin | Admin only |
| `POST /admin/api/pricing-requests/{id}/approve` | ✅ Yes | admin | Admin only |
| `POST /admin/api/pricing-requests/{id}/reject` | ✅ Yes | admin | Admin only |
| `GET /api/custom-pricing/plan/{id}` | ✅ Yes | user | Plan owner |
| `POST /admin/api/pricing-plans/{id}/create-razorpay-order` | ✅ Yes | admin | Admin only |
| `GET /admin/api/pending-payments` | ✅ Yes | admin | Admin only |
| `POST /api/custom-pricing/confirm-payment` | ✅ Yes | user | Plan owner |

---

## 📊 Status Values

### Pricing Request Status
- `pending` - Awaiting admin review
- `approved` - Approved, custom plan created
- `rejected` - Rejected with admin notes
- `paid` - Payment received, plan active

### Custom Plan Payment Status
- `pending` - Waiting for customer payment
- `paid` - Payment received
- `expired` - Plan validity expired

---

## 🔍 Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Errors

| Status | Message | Cause |
|--------|---------|-------|
| 400 | "Email and password required" | Missing login credentials |
| 401 | "Invalid password" | Wrong admin password |
| 403 | "Admin access required" | Non-admin accessing admin endpoint |
| 404 | "Request not found" | Invalid request/plan ID |
| 500 | "Failed to submit pricing request" | Database error |

---

## 💻 Testing with Postman

1. **Import endpoints** from this guide
2. **Set variables:**
   - `base_url` = `http://localhost:8000`
   - `user_token` = (get from user login)
   - `admin_token` = (get from admin login)
3. **Run requests** in order shown in workflow section

---

## 🚀 Production Checklist

- [ ] Database tables created and migrated
- [ ] Environment variables set (ADMIN_EMAIL, ADMIN_PASSWORD)
- [ ] Razorpay keys configured
- [ ] Email templates created
- [ ] Webhook URL configured in Razorpay dashboard
- [ ] SSL certificate installed
- [ ] Admin panel frontend built
- [ ] Customer form frontend built
- [ ] Payment confirmation flow tested
- [ ] Plan upgrade logic implemented

---

## 📞 Support

For API documentation details, see:
- [CUSTOM_PRICING_IMPLEMENTATION_SUMMARY.md](CUSTOM_PRICING_IMPLEMENTATION_SUMMARY.md)
- [ADMIN_PANEL_DESIGN_ANALYSIS.md](ADMIN_PANEL_DESIGN_ANALYSIS.md)

