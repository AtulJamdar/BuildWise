# Plan Renewal System - Implementation Guide

## Overview

The Plan Renewal System enables customers to extend their custom pricing plans beyond the initial expiry date. This comprehensive system includes:

- **Pro-rated pricing calculation** based on custom renewal periods
- **Automated payment processing** via Razorpay
- **Email notifications** at key renewal stages
- **Plan activation** with automatic expiry extension
- **Invoice generation** for accounting/compliance

## System Architecture

```
User Interface (PlanRenewal.jsx)
    ↓
Renewal API (customerApi.js)
    ↓
Backend Endpoints (api/main.py)
    ↓
Renewal Service (renewal_service.py)
    ↓
Database (renewal_requests, custom_pricing_plans, invoices)
    ↓
Razorpay Gateway → Webhook Handler → Plan Activation
```

## Component Breakdown

### 1. Frontend - Plan Renewal Page

**File:** `buildwise-frontend/src/pages/PlanRenewal.jsx`

**Features:**
- Displays user's expiring plans (within 30 days)
- Dynamic renewal period selection (30/90/180/365 days)
- Real-time pricing calculation with automatic discounts
- Razorpay payment modal integration
- Success/error handling

**Key Hooks Used:**
```javascript
const { createRenewal, getRenewalOptions } = useRenewal();
const { myPlans, fetchMyPlans } = useCustomPlans();
```

**Flow:**
1. Fetch user's custom plans on component mount
2. Filter plans expiring within 30 days
3. User selects plan and renewal period
4. Calculate pro-rated price with discounts
5. Show Razorpay payment modal
6. On success, confirm payment and redirect

### 2. Frontend - Renewal Hook

**File:** `buildwise-frontend/src/hooks/useRenewal.js`

**Functions:**
- `getRenewalOptions(planPrice, planValidity)` - Generate renewal period options with pricing
- `createRenewal(planId, renewalDays)` - Create renewal request
- `getRenewalDetails(renewalId)` - Fetch renewal details
- `checkPaymentStatus(renewalId)` - Check payment status
- `cancelRenewal(renewalId)` - Cancel pending renewal
- `getStatusBadgeColor(status)` - Get visual status indicator

**Usage:**
```javascript
const { createRenewal, renewalOptions } = useRenewal();
const options = getRenewalOptions(5000, 365); // Get renewal options
const renewal = await createRenewal(planId, 365); // Create renewal
```

### 3. Frontend - Utility Functions

**File:** `buildwise-frontend/src/utils/renewalUtils.js`

**Key Functions:**
- `calculateProRatedPrice(original_price, original_days, renewal_days)`
- `calculateDiscount(renewal_days)` - 5% (90d), 10% (180d), 15% (365d)
- `calculateFinalPrice(basePrice, discountPercent)`
- `getRenewalUrgency(expiryDate)` - Urgency level with message
- `validateRenewalRequest(planId, renewalDays, price)`
- `generateRenewalSummary(plan, renewalDays, pricingInfo)`

### 4. Backend - Renewal Service

**File:** `core/renewal_service.py`

**Core Functions:**

#### `create_renewal_request(plan_id, user_id, renewal_days)`
Creates a renewal request and Razorpay order.

```python
renewal = create_renewal_request(
    plan_id=123,
    user_id=456,
    renewal_days=365
)
# Returns: {renewal_id, order_id, payment_link, pro_rated_price}
```

#### `calculate_pro_rated_price(original_price, original_days, renewal_days)`
Calculates price for custom renewal periods.

```python
price = calculate_pro_rated_price(
    original_price=5000,
    original_days=365,
    renewal_days=180
)  # Returns: 2500
```

#### `activate_renewal_plan(renewal_id)`
Activates renewal after successful payment.

```python
activation = activate_renewal_plan(renewal_id=789)
# Returns: {renewal_id, plan_id, new_expiry, invoice_id}
```

#### `update_renewal_payment_status(renewal_id, razorpay_payment_id, status)`
Updates payment status after Razorpay transaction.

```python
renewal_data = update_renewal_payment_status(
    renewal_id=789,
    razorpay_payment_id="pay_xyz123",
    status="paid"
)
```

#### `get_renewal_requests_by_user(user_id)`
Retrieves all renewals for a user.

```python
renewals = get_renewal_requests_by_user(user_id=456)
# Returns: List of renewal objects
```

### 5. Backend - API Endpoints

**File:** `api/main.py`

#### Create Renewal Request
```
POST /api/plans/{plan_id}/renew
Headers: Authorization: Bearer {token}
Body: {renewal_days: int}
Response: {success: bool, renewal: {...}, message: str}
```

#### Get User Renewals
```
GET /api/renewals/my
Headers: Authorization: Bearer {token}
Response: {success: bool, renewals: [...], count: int}
```

#### Get Renewal Details
```
GET /api/renewals/{renewal_id}
Headers: Authorization: Bearer {token}
Response: {success: bool, renewal: {...}}
```

#### Check Payment Status
```
GET /api/renewals/{renewal_id}/payment-status
Headers: Authorization: Bearer {token}
Response: {success: bool, renewal_id: int, status: str, is_paid: bool}
```

#### Confirm Payment
```
POST /api/renewals/{renewal_id}/confirm-payment
Headers: Authorization: Bearer {token}
Body: {razorpay_payment_id: str}
Response: {success: bool, message: str, plan_expires_at: datetime}
```

#### Cancel Renewal
```
POST /api/renewals/{renewal_id}/cancel
Headers: Authorization: Bearer {token}
Response: {success: bool, message: str, renewal: {...}}
```

### 6. Razorpay Webhook Handler

**File:** `api/main.py` - `/webhooks/razorpay/renewal`

**Flow:**
1. Receives payment.authorized event from Razorpay
2. Finds renewal request by order_id
3. Updates renewal status to 'paid'
4. Calls `activate_renewal_plan()` to extend expiry
5. Generates invoice record
6. Sends confirmation email
7. Returns success response

**Important:** Webhook does not require authentication (Razorpay triggers it server-to-server).

### 7. Database Schema

**Table: renewal_requests**
```sql
- id (PRIMARY KEY)
- plan_id (FOREIGN KEY → custom_pricing_plans)
- user_id (FOREIGN KEY → users)
- renewal_days (INTEGER)
- pro_rated_price (DECIMAL)
- status (VARCHAR: pending, approved, paid, cancelled)
- razorpay_order_id (VARCHAR)
- razorpay_payment_id (VARCHAR)
- payment_link (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Indexes:**
- idx_renewal_plan_id
- idx_renewal_user_id
- idx_renewal_status
- idx_renewal_created_at

### 8. Email Notifications

**New Functions in `utils/email_service.py`:**

#### `send_renewal_offer_email()`
Sent 7 days before plan expiry. Includes multiple renewal options with pricing and discounts.

**Template:** Professional HTML email with:
- Current plan expiry date
- Renewal period options (30/90/180/365 days)
- Pro-rated pricing for each option
- Discount indicators
- Call-to-action button to renewal page

#### `send_renewal_confirmation_email()`
Sent immediately after successful payment. Confirms plan extension.

**Template:** Celebration-style email with:
- Renewal confirmation
- New expiry date
- Amount charged
- Invoice ID
- Next steps

#### `send_plan_expiry_reminder_email()`
Sent multiple times:
- 7 days before expiry
- 1 day before expiry
- On expiry date

**Templates Vary By Urgency:**
- 7+ days: Yellow warning, "Time to renew"
- 1-7 days: Orange urgent, "Expires soon"
- 1 day: Red critical, "Expires tomorrow"
- 0 days: Red critical, "Plan expired - renew now"

## Integration Points

### 1. Connecting to Existing Scans

When a scan is completed, track usage:

```python
# In scan completion handler
from core.plan_activation_service import track_usage

track_usage(plan_id=user_plan_id, scans_count=1)
```

### 2. Usage Limiting (Optional)

Prevent scans if plan limit exceeded:

```python
# In scan validation
from core.plan_activation_service import get_plan_usage

usage = get_plan_usage(plan_id)
if usage['percentage'] >= 100:
    raise Exception("Plan scan limit exceeded. Renew to continue.")
```

### 3. Dashboard Integration

Add renewal metrics to admin dashboard:

```javascript
// Show:
- Plans expiring in 7 days
- Pending renewals awaiting payment
- Revenue from renewals (paid status)
- Renewal rate (renewals / expired plans)
```

### 4. Auto-Renewal Feature (Future)

Allow customers to enable automatic renewals:

```python
# Add auto_renewal field to custom_pricing_plans
ALTER TABLE custom_pricing_plans ADD COLUMN auto_renewal BOOLEAN DEFAULT FALSE;

# On expiry, auto-create renewal if enabled
if plan['auto_renewal']:
    create_renewal_request(plan_id, user_id, 365)
```

## Testing Checklist

### Unit Tests
- [ ] Pro-rated price calculation for various periods
- [ ] Discount calculation accuracy
- [ ] Status transitions (pending → paid)
- [ ] Email template rendering

### Integration Tests
- [ ] Create renewal → Razorpay order creation
- [ ] Webhook handling → Plan activation
- [ ] Payment confirmation → Email sent
- [ ] User can't create renewal for non-expiring plan

### End-to-End Tests
- [ ] User navigates to renewal page
- [ ] Selects expiring plan and renewal period
- [ ] Completes Razorpay payment
- [ ] Plan expiry extended correctly
- [ ] Receives confirmation email
- [ ] Can view renewed plan in dashboard

### Razorpay Test Mode
- [ ] Use test API keys from Razorpay dashboard
- [ ] Test payment success/failure scenarios
- [ ] Verify webhook signature validation
- [ ] Check order creation with correct amounts

## Deployment Checklist

- [ ] Create renewal database tables: `psql < db/create_renewal_requests_table.sql`
- [ ] Set Razorpay API keys in environment variables
- [ ] Configure SMTP for renewal emails
- [ ] Deploy renewal service to production
- [ ] Update API main.py with renewal endpoints
- [ ] Deploy frontend with PlanRenewal.jsx
- [ ] Test complete workflow in staging
- [ ] Configure Razorpay webhook URL in dashboard
- [ ] Monitor webhook deliveries for first 24 hours
- [ ] Update customer documentation with renewal process

## Monitoring & Maintenance

### Key Metrics to Track
- Renewal request creation rate
- Payment success rate
- Webhook failure rate
- Average renewal period (30/90/180/365)
- Revenue from renewals
- Customer renewal rate (renewals / expired plans)

### Common Issues & Solutions

**Issue:** Webhook not triggering
- **Solution:** Verify webhook URL in Razorpay dashboard, check firewall/network

**Issue:** Payment confirmation not processed
- **Solution:** Check webhook handler logs, verify order_id matching

**Issue:** Emails not sent
- **Solution:** Verify SMTP credentials, check email service logs, test SMTP connection

**Issue:** Renewal creating duplicate invoices
- **Solution:** Add unique constraint on (plan_id, renewal_date), check activation logic

## Performance Optimization

- Database indexes on: plan_id, user_id, status, created_at
- Cache renewal options (rarely change)
- Batch process expiry reminders (cron job)
- Async email sending (non-blocking)
- Connection pooling for DB queries

## Security Considerations

- JWT validation on all customer endpoints
- Order ownership verification (user_id match)
- Razorpay signature validation in webhook
- PCI compliance (no card data stored locally)
- SQL injection prevention (parameterized queries)
- Rate limiting on payment endpoints
- Logging of all renewal activities for audit trail

## Future Enhancements

1. **Auto-Renewal** - Automatic renewal on expiry
2. **Renewal Recommendations** - Based on usage patterns
3. **Renewal Coupons** - Discount codes for renewals
4. **Flexible Billing** - Monthly subscription option
5. **Usage-Based Pricing** - Pay per scan for overages
6. **Plan Downgrade** - Reduce scans/features on renewal
7. **Group Renewals** - Renew multiple plans together
8. **Renewal Analytics** - Churn analysis, renewal patterns

---

**Last Updated:** 2024
**Status:** Production Ready
**Version:** 1.0
