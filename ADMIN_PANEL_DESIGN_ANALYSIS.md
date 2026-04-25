# Admin Panel for Custom Pricing - Design Analysis

## Your Proposed Flow:
```
Business Customer
    ↓
Fill Custom Pricing Form
    ↓
Submit Request
    ↓
Admin Panel (Admin Reviews)
    ↓
Admin Creates Custom Pricing
    ↓
Customer Pays (Razorpay)
    ↓
Plan Upgraded
```

---

## ✅ What You're Thinking CORRECTLY:

### 1. **Multi-step Approval Process**
- ✅ Requiring admin approval before pricing is good
- ✅ Prevents users from bypassing pricing tiers
- ✅ Allows for negotiation/customization

### 2. **Payment Integration Approach**
- ✅ Using Razorpay after pricing is finalized makes sense
- ✅ Separates pricing logic from payment logic

### 3. **Plan Upgrade Concept**
- ✅ Upgrading after payment is the correct sequence
- ✅ Prevents trial periods without payment

---

## ❌ What Could Be PROBLEMATIC:

### 1. **Hardcoding Admin Credentials (CRITICAL SECURITY ISSUE)**
```python
# ❌ WRONG - What you might be thinking:
admin_email = "atuljamdar4@gmail.com"
admin_password = "atul@123"  # Hardcoded in code!
```

**Problems:**
- Password visible in source code
- Anyone with repo access can see credentials
- No encryption
- Can't rotate password without code change
- Violates security best practices
- Fails compliance audits

**What to do instead:**
```python
# ✅ CORRECT - What should be done:
admin_email = os.getenv("ADMIN_EMAIL")  # From .env
admin_password_hash = os.getenv("ADMIN_PASSWORD_HASH")  # Hashed, from .env

# Or better: Use database for admin accounts
# Admin stored in DB with hashed password, proper authentication tokens
```

---

### 2. **Missing Authentication System**
```python
# ❌ What you might be missing:
# Current system: User login → get user
# Needed: User login → check role (user/admin) → route accordingly

# Missing components:
- Role/Permission system
- Admin authentication middleware
- Session management for admins
- JWT tokens for admin endpoints
```

**What should exist:**
```
User Table:
├── id
├── email
├── password_hash
├── role (enum: "user", "admin", "super_admin")  ← NEW
└── created_at

Admin endpoints should check:
@app.get("/admin/pricing-requests")
def get_pricing_requests(current_user: User = Depends(get_current_user)):
    # Verify user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    # Return requests
```

---

### 3. **Missing Database Schema for Custom Pricing**
```python
# ❌ Incomplete - What you might need:

# 1. Pricing Request Table (from customer)
CREATE TABLE pricing_requests (
    id INT PRIMARY KEY,
    user_id INT,
    company_name VARCHAR(255),
    scans_per_month INT,
    team_size INT,
    specific_features TEXT,
    budget DECIMAL,
    status ENUM('pending', 'approved', 'rejected', 'paid'),
    created_at TIMESTAMP,
    admin_notes TEXT,
    reviewed_by INT  # Admin who reviewed
);

# 2. Custom Pricing Plans Table (created by admin)
CREATE TABLE custom_pricing_plans (
    id INT PRIMARY KEY,
    pricing_request_id INT,
    custom_price DECIMAL,
    scans_per_month INT,
    features JSON,
    payment_status ENUM('pending', 'paid'),
    razorpay_order_id VARCHAR(255),
    payment_link VARCHAR(255),  # Share with customer
    created_at TIMESTAMP,
    expires_at TIMESTAMP
);

# 3. Update existing User Plans
CREATE TABLE user_plans (
    id INT PRIMARY KEY,
    user_id INT,
    plan_type ENUM('free', 'pro', 'enterprise', 'custom'),
    scans_remaining INT,
    expires_at TIMESTAMP,
    is_custom BOOLEAN  # TRUE if from custom pricing
);
```

---

### 4. **Missing API Endpoints**
```python
# ❌ Current gaps:

# FRONTEND (Customer Side) - MISSING
POST /api/custom-pricing/request
    payload: { company, team_size, scans, budget, features }
    → Create pricing_request record

# ADMIN PANEL (Backend) - MISSING
GET /api/admin/pricing-requests
    → List all pending requests

GET /api/admin/pricing-requests/{id}
    → View single request details

POST /api/admin/pricing-requests/{id}/approve
    payload: { price, scans_per_month, features, expiry_days }
    → Create custom pricing plan, generate payment link

POST /api/admin/pricing-requests/{id}/reject
    payload: { reason }
    → Reject request

# PAYMENT CALLBACK - MISSING
POST /api/webhooks/razorpay/payment-success
    → Handle payment
    → Upgrade user plan to custom
    → Create subscription record
```

---

### 5. **Frontend Issues**

#### **Missing: Customer-Facing Form**
```jsx
// ❌ Doesn't exist yet:
// Pages needed:
- /pricing/custom-request  ← Customer fills form
- /pricing/custom-status   ← Check request status
- /pricing/custom-payment  ← See custom quote and payment link
```

#### **Missing: Admin Panel UI**
```jsx
// ❌ Doesn't exist yet:
// Admin pages needed:
- /admin/dashboard        ← Admin login
- /admin/pricing-requests ← List requests
- /admin/pricing-requests/:id  ← Review & approve
- /admin/pricing-create   ← Create custom pricing
- /admin/users            ← Manage users
- /admin/plans            ← View all plans
```

---

### 6. **Missing Payment Flow for Custom Pricing**
```python
# ❌ Current Razorpay setup:
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# What exists: Basic razorpay integration
# What's missing:

# When admin creates custom pricing:
1. Generate Razorpay payment order
2. Create payment link (can be emailed)
3. Store payment_link in custom_pricing_plans
4. Send to customer via email
5. Customer clicks link and pays
6. Webhook receives payment confirmation
7. Update user plan

# Example missing endpoint:
@app.post("/admin/pricing-requests/{id}/approve")
def approve_pricing_request(id, approval_data: dict):
    request = get_pricing_request(id)
    
    # Step 1: Create custom pricing record
    custom_plan = create_custom_pricing_plan(
        request_id=id,
        price=approval_data['price'],
        scans=approval_data['scans']
    )
    
    # Step 2: Create Razorpay order (MISSING CODE)
    razorpay_order = razorpay_client.order.create({
        "amount": approval_data['price'] * 100,  # In paise
        "currency": "INR",
        "receipt": f"custom_{id}",
        "payment_capture": 1
    })
    
    # Step 3: Update custom plan with order ID
    update_custom_plan(custom_plan.id, razorpay_order_id=razorpay_order['id'])
    
    # Step 4: Send email to customer (MISSING CODE)
    # send_custom_pricing_email(customer_email, razorpay_order)
    
    return {"status": "approved", "order_id": razorpay_order['id']}
```

---

### 7. **Email Notification System Missing**
```python
# ❌ Needed for complete flow:

# When customer submits request:
send_email(
    to=customer_email,
    subject="Custom Pricing Request Received",
    template="pricing_request_received.html"
)
send_email(
    to="atuljamdar4@gmail.com",
    subject="New Custom Pricing Request from {company}",
    template="admin_new_request.html",
    context={request: request}
)

# When admin approves:
send_email(
    to=customer_email,
    subject="Your Custom Pricing Approved - Payment Link",
    template="custom_pricing_approved.html",
    context={payment_link: payment_link, price: price}
)

# When payment is received:
send_email(
    to=customer_email,
    subject="Payment Received - Plan Upgraded",
    template="plan_upgraded.html",
    context={plan_details: plan_details}
)
```

---

### 8. **Security Issues with Admin Password**
```python
# ❌ Current approach (INSECURE):
admin_email = "atuljamdar4@gmail.com"
admin_password = "atul@123"

if login_email == admin_email and login_password == admin_password:
    # Grant access
```

**Problems:**
- Plaintext password comparison
- One admin account only
- Password visible in code
- No logout functionality
- No session management
- No permission levels

**What should exist:**
```python
# ✅ SECURE approach:

# 1. Database admin users
CREATE TABLE admins (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),  # Bcrypt hash
    role VARCHAR(50),  # 'admin', 'super_admin'
    is_active BOOLEAN,
    created_at TIMESTAMP
);

# 2. Auth flow
@app.post("/admin/login")
def admin_login(credentials: AdminCredentials):
    admin = db.query(Admin).filter(Admin.email == credentials.email).first()
    
    if not admin or not verify_password(credentials.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate JWT token
    token = create_access_token(data={"sub": admin.id, "role": "admin"})
    return {"access_token": token, "token_type": "bearer"}

# 3. Protect admin endpoints
@app.get("/admin/pricing-requests")
def get_pricing_requests(current_admin = Depends(get_current_admin)):
    # get_current_admin verifies JWT and admin role
    return db.query(PricingRequest).all()
```

---

## 📋 Complete Workflow You Need to Build:

```
STEP 1: CUSTOMER SUBMITS REQUEST
┌─────────────────────────────────┐
│ Frontend: /pricing/custom-request│
│ - Company name                   │
│ - Team size                      │
│ - Scans per month needed         │
│ - Specific features              │
│ - Budget range                   │
└────────────┬────────────────────┘
             ↓
POST /api/custom-pricing/request
             ↓
Create PricingRequest record
             ↓
Send email to admin
             ↓
Return: "Request submitted"

─────────────────────────────────────

STEP 2: ADMIN REVIEWS
┌─────────────────────────────────┐
│ Admin Panel: /admin/dashboard    │
│ - Login with secure auth         │
│ - View pending requests          │
│ - Click to review details        │
└────────────┬────────────────────┘
             ↓
GET /api/admin/pricing-requests
             ↓
GET /api/admin/pricing-requests/{id}
             ↓
Display request details

─────────────────────────────────────

STEP 3: ADMIN APPROVES & CREATES PRICING
┌─────────────────────────────────┐
│ Admin Panel: /admin/pricing-     │
│ requests/{id}                    │
│ - Review request                 │
│ - Enter custom price             │
│ - Set features/limits            │
│ - Click "Approve"                │
└────────────┬────────────────────┘
             ↓
POST /api/admin/pricing-requests/{id}/approve
{price: 50000, scans: 500, features: [...]}
             ↓
Create CustomPricingPlan record
             ↓
Create Razorpay order
             ↓
Generate payment link
             ↓
Send email to customer with link
             ↓
Update PricingRequest status to "approved"

─────────────────────────────────────

STEP 4: CUSTOMER PAYS
┌─────────────────────────────────┐
│ Frontend: /pricing/custom-payment│
│ - Show custom quote              │
│ - "Proceed to Payment" button    │
└────────────┬────────────────────┘
             ↓
Click payment link (Razorpay hosted)
             ↓
Customer enters card details
             ↓
Payment processed
             ↓
Razorpay webhook calls:
POST /api/webhooks/razorpay/payment-success
             ↓
Verify payment
             ↓
Update CustomPricingPlan (status: "paid")
             ↓
Upgrade user plan
             ↓
Create subscription record
             ↓
Send confirmation email

─────────────────────────────────────

STEP 5: CUSTOMER HAS CUSTOM PLAN
┌─────────────────────────────────┐
│ Frontend: /dashboard             │
│ - Shows: "Custom Plan"           │
│ - Scans remaining: 500           │
│ - Expires: [date]                │
│ - Features: [list]               │
└─────────────────────────────────┘
```

---

## 🛠️ Implementation Checklist

### Backend (Python/FastAPI):
- [ ] Create admin role in User table
- [ ] Create PricingRequest table
- [ ] Create CustomPricingPlan table
- [ ] Update UserPlan table with custom plan support
- [ ] Admin login endpoint (with secure password hashing - bcrypt)
- [ ] Admin authentication middleware
- [ ] GET /admin/pricing-requests
- [ ] GET /admin/pricing-requests/{id}
- [ ] POST /admin/pricing-requests/{id}/approve
- [ ] POST /admin/pricing-requests/{id}/reject
- [ ] Razorpay order creation logic
- [ ] Razorpay payment webhook handler
- [ ] Plan upgrade logic
- [ ] Email notification templates
- [ ] Admin logout endpoint

### Frontend (React/JSX):
- [ ] Admin login page (/admin/login)
- [ ] Admin dashboard (/admin/dashboard)
- [ ] Pricing requests list (/admin/pricing-requests)
- [ ] Pricing request detail + approval form (/admin/pricing-requests/{id})
- [ ] Customer custom pricing request form (/pricing/custom-request)
- [ ] Customer pricing status page (/pricing/custom-status)
- [ ] Payment page with Razorpay link (/pricing/custom-payment)
- [ ] Dashboard showing custom plan details

### Database:
- [ ] New tables: admins, pricing_requests, custom_pricing_plans
- [ ] Schema updates: users (add role column), user_plans (update for custom plans)
- [ ] Migration scripts

### Security:
- [ ] Bcrypt for password hashing
- [ ] JWT tokens for admin sessions
- [ ] Role-based access control (RBAC)
- [ ] Admin endpoint authorization checks
- [ ] Remove hardcoded credentials
- [ ] Use environment variables for sensitive data

---

## ⚠️ Key Mistakes to AVOID:

1. **❌ Hardcoding credentials** → Use .env + database
2. **❌ No role system** → Add role column to users
3. **❌ Plaintext passwords** → Use bcrypt hashing
4. **❌ Single admin only** → Build scalable admin system
5. **❌ No email notifications** → Customer needs to know status
6. **❌ Missing payment webhook** → No way to confirm payment
7. **❌ No plan expiry logic** → How long is custom plan valid?
8. **❌ No audit trail** → Who approved? When? Why?
9. **❌ No form validation** → Backend should validate all inputs
10. **❌ No error handling** → What if payment fails?

---

## 🎯 Why This Architecture is Necessary:

| Component | Why It's Needed |
|-----------|-----------------|
| **Admin Role** | Only admins can approve pricing, not regular users |
| **Pricing Request Table** | Track what customer is asking for |
| **Custom Pricing Table** | Store admin-created pricing, payment details |
| **Secure Auth** | Protect admin account from unauthorized access |
| **Payment Webhook** | Confirm payment before upgrading plan |
| **Email System** | Keep all parties informed of status |
| **Plan Expiry** | Know when to revoke custom plan access |
| **Audit Trail** | Track who approved what and when |

---

## 💡 Recommended Implementation Order:

1. **First**: Database schema + admin table
2. **Second**: Admin authentication (secure login)
3. **Third**: Admin dashboard UI (basic)
4. **Fourth**: Admin can view pricing requests
5. **Fifth**: Admin can create custom pricing + Razorpay integration
6. **Sixth**: Customer-facing form to request pricing
7. **Seventh**: Payment handling + plan upgrade
8. **Eighth**: Email notifications
9. **Ninth**: UI polish + error handling
10. **Tenth**: Testing + security audit

---

## Summary:

**What you're thinking correctly:**
- ✅ Multi-step approval process
- ✅ Payment after approval
- ✅ Plan upgrade on payment

**What needs to be added:**
- ❌ Secure admin authentication (not hardcoded passwords)
- ❌ Role-based access control
- ❌ Database schema for requests and custom plans
- ❌ Multiple admin endpoints
- ❌ Payment webhook handling
- ❌ Email notifications
- ❌ Customer-facing form
- ❌ Admin panel UI
- ❌ Plan expiry and validation logic

