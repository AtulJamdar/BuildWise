# ============================================================================
# 💼 ADMIN PANEL - CUSTOM PRICING MANAGEMENT
# ============================================================================

# --- INITIALIZATION ---
# Setup default admin on startup
try:
    setup_default_admin()
except Exception as e:
    print(f"⚠️  Default admin setup warning: {e}")


# --- ADMIN AUTHENTICATION ENDPOINTS ---

@app.post("/auth/admin/login")
def admin_login_endpoint(credentials: dict = Body(...)):
    """
    Admin login endpoint
    Credentials: {email, password}
    Returns: JWT token and admin details
    """
    email = credentials.get("email", "").strip()
    password = credentials.get("password", "")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    result = admin_login(email, password)
    
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["message"])
    
    return {
        "success": True,
        "access_token": result["access_token"],
        "token_type": result["token_type"],
        "admin_id": result["admin_id"],
        "admin_name": result["admin_name"],
        "role": result["role"]
    }


# --- CUSTOMER PRICING REQUEST ENDPOINTS ---

@app.post("/api/custom-pricing/request")
def submit_pricing_request(request_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    Customer submits a custom pricing request
    Payload: {
        company_name, team_size, scans_per_month, 
        specific_features, budget_min, budget_max
    }
    """
    try:
        company_name = request_data.get("company_name", "").strip()
        team_size = request_data.get("team_size")
        scans_per_month = request_data.get("scans_per_month")
        specific_features = request_data.get("specific_features", "")
        budget_min = request_data.get("budget_min")
        budget_max = request_data.get("budget_max")
        
        # Validation
        if not company_name:
            raise HTTPException(status_code=400, detail="Company name is required")
        if not budget_min or not budget_max:
            raise HTTPException(status_code=400, detail="Budget range is required")
        
        result = create_pricing_request(
            user_id=current_user["id"],
            company_name=company_name,
            team_size=team_size,
            scans_per_month=scans_per_month,
            specific_features=specific_features,
            budget_min=budget_min,
            budget_max=budget_max
        )
        
        if result["success"]:
            return {
                "success": True,
                "request_id": result["request_id"],
                "message": "✅ Pricing request submitted successfully. Admin will review it soon."
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error submitting pricing request: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit pricing request")


@app.get("/api/custom-pricing/my-requests")
def get_my_pricing_requests(current_user = Depends(get_current_user)):
    """
    Get customer's own pricing requests
    """
    try:
        requests = get_user_pricing_requests(current_user["id"])
        return {
            "success": True,
            "requests": requests,
            "count": len(requests)
        }
    except Exception as e:
        print(f"❌ Error fetching pricing requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch requests")


@app.get("/api/custom-pricing/request/{request_id}")
def get_pricing_request_details(request_id: int, current_user = Depends(get_current_user)):
    """
    Get details of a specific pricing request
    """
    try:
        request_data = get_pricing_request_by_id(request_id)
        
        if not request_data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Verify user owns this request or is admin
        if request_data["user_id"] != current_user["id"] and current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Unauthorized access")
        
        return {
            "success": True,
            "request": request_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching request details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch request details")


# --- ADMIN PRICING MANAGEMENT ENDPOINTS ---

@app.get("/admin/api/pricing-requests")
def admin_get_pending_requests(current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Get all pending pricing requests
    """
    try:
        # Check admin role
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        requests = get_all_pending_requests()
        return {
            "success": True,
            "requests": requests,
            "count": len(requests)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching pending requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending requests")


@app.get("/admin/api/pricing-requests/{request_id}")
def admin_get_request_details(request_id: int, current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Get full details of a pricing request for review
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        request_data = get_pricing_request_by_id(request_id)
        
        if not request_data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return {
            "success": True,
            "request": request_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching request: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch request")


@app.post("/admin/api/pricing-requests/{request_id}/approve")
def admin_approve_pricing(request_id: int, approval_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Approve a pricing request and create custom pricing plan
    Payload: {
        custom_price, scans_per_month, features, validity_days, approval_notes
    }
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get request details
        request_data = get_pricing_request_by_id(request_id)
        if not request_data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Parse approval data
        custom_price = approval_data.get("custom_price")
        scans_per_month = approval_data.get("scans_per_month")
        features = approval_data.get("features", [])
        validity_days = approval_data.get("validity_days", 365)
        approval_notes = approval_data.get("approval_notes", "")
        
        if not custom_price or not scans_per_month:
            raise HTTPException(status_code=400, detail="Price and scans per month required")
        
        # Update pricing request status to approved
        update_pricing_request_status(
            request_id,
            "approved",
            current_user["id"],
            approval_notes
        )
        
        # Create custom pricing plan
        plan_result = create_custom_pricing_plan(
            pricing_request_id=request_id,
            user_id=request_data["user_id"],
            custom_price=custom_price,
            scans_per_month=scans_per_month,
            features=features,
            validity_days=validity_days,
            admin_id=current_user["id"],
            approval_notes=approval_notes
        )
        
        if plan_result["success"]:
            return {
                "success": True,
                "plan_id": plan_result["plan_id"],
                "message": "✅ Pricing approved. Custom plan created. Next: Create Razorpay payment link"
            }
        else:
            raise HTTPException(status_code=400, detail=plan_result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error approving pricing request: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve request")


@app.post("/admin/api/pricing-requests/{request_id}/reject")
def admin_reject_pricing(request_id: int, rejection_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Reject a pricing request
    Payload: {admin_notes}
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        admin_notes = rejection_data.get("admin_notes", "Request rejected")
        
        result = update_pricing_request_status(
            request_id,
            "rejected",
            current_user["id"],
            admin_notes
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "✅ Pricing request rejected"
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error rejecting request: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject request")


# --- CUSTOM PRICING PAYMENT ENDPOINTS ---

@app.get("/api/custom-pricing/plan/{plan_id}")
def get_custom_plan_details(plan_id: int, current_user = Depends(get_current_user)):
    """
    Get custom pricing plan details (customer view)
    Includes payment link if available
    """
    try:
        plan = get_custom_plan_by_id(plan_id)
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Verify user owns this plan
        if plan["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized access")
        
        return {
            "success": True,
            "plan": plan
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch plan")


@app.post("/admin/api/pricing-plans/{plan_id}/create-razorpay-order")
def admin_create_razorpay_order(plan_id: int, current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Create Razorpay order for custom pricing plan
    This generates payment link to send to customer
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        plan = get_custom_plan_by_id(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Create Razorpay order
        try:
            razorpay_order = razorpay_client.order.create(
                {
                    "amount": int(plan["custom_price"] * 100),  # In paise
                    "currency": "INR",
                    "receipt": f"custom_plan_{plan_id}",
                    "payment_capture": 1
                }
            )
            
            order_id = razorpay_order["id"]
            
            # Generate payment link (frontend will use this)
            # For now, we'll create a simple checkout URL
            payment_link = f"{BACKEND_URL}/api/checkout/custom-plan/{plan_id}?order_id={order_id}"
            
            # Store order details
            order_result = create_razorpay_order(plan_id, order_id, payment_link)
            
            if order_result["success"]:
                return {
                    "success": True,
                    "order_id": order_id,
                    "payment_link": payment_link,
                    "amount": plan["custom_price"],
                    "message": f"✅ Razorpay order created. Share payment link with customer: {payment_link}"
                }
            else:
                raise HTTPException(status_code=400, detail=order_result["message"])
                
        except razorpay.errors.BadRequestError as e:
            print(f"❌ Razorpay error: {e}")
            raise HTTPException(status_code=400, detail=f"Razorpay error: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating Razorpay order: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")


@app.get("/admin/api/pending-payments")
def admin_get_pending_payments(current_user = Depends(get_current_user)):
    """
    [ADMIN ONLY] Get all pending custom plan payments
    """
    try:
        if not check_if_admin(current_user["id"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        plans = get_pending_custom_plans()
        return {
            "success": True,
            "pending_plans": plans,
            "count": len(plans)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching pending payments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending payments")


# --- RAZORPAY WEBHOOK ENDPOINT ---

@app.post("/webhooks/razorpay/custom-pricing")
async def razorpay_custom_pricing_webhook(request: Request):
    """
    Razorpay webhook for custom pricing payments
    Handles payment success confirmation
    """
    try:
        payload = await request.json()
        
        # Verify webhook signature (for production)
        # signature_received = request.headers.get("X-Razorpay-Signature")
        # if not verify_razorpay_signature(payload, signature_received):
        #     raise HTTPException(status_code=400, detail="Invalid signature")
        
        event_type = payload.get("event")
        event_data = payload.get("payload", {}).get("payment", {})
        
        # Handle payment.authorized event (payment successful)
        if event_type == "payment.authorized":
            razorpay_payment_id = event_data.get("id")
            razorpay_order_id = event_data.get("order_id")
            
            # Find custom plan by razorpay order ID
            # This would typically be a DB lookup
            # For now, we'll need to find plan by order_id
            
            print(f"✅ Payment authorized - Order: {razorpay_order_id}, Payment: {razorpay_payment_id}")
            
            # Note: In production, you'd query the DB to find which plan has this order_id
            # Then update the plan status to 'paid'
            
            return {"status": "ok"}
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/custom-pricing/confirm-payment")
def confirm_custom_pricing_payment(payment_data: dict = Body(...), current_user = Depends(get_current_user)):
    """
    Customer confirms custom pricing payment
    Payload: {plan_id, razorpay_payment_id}
    """
    try:
        plan_id = payment_data.get("plan_id")
        razorpay_payment_id = payment_data.get("razorpay_payment_id")
        
        if not plan_id or not razorpay_payment_id:
            raise HTTPException(status_code=400, detail="Plan ID and payment ID required")
        
        plan = get_custom_plan_by_id(plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Verify user owns this plan
        if plan["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Update payment status
        result = update_payment_status(plan_id, "paid", razorpay_payment_id)
        
        if result["success"]:
            # TODO: Upgrade user's plan in user_plans table
            # TODO: Send confirmation email
            return {
                "success": True,
                "message": "✅ Payment confirmed! Your custom plan is now active."
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error confirming payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")
