"""
Custom Pricing Plan Service
Handles admin creation and management of custom pricing plans
"""
from datetime import datetime, timedelta
from db.connection import get_connection
from utils.email_service import (
    send_pricing_request_approved_email,
    send_payment_link_email,
    send_payment_confirmation_email
)
import json


def get_user_email_and_company(user_id):
    """Get user email and company name from database."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        result = cur.fetchone()
        email = result[0] if result else None
        
        # Get company name from pricing request
        cur.execute(
            "SELECT company_name FROM pricing_requests WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
            (user_id,)
        )
        company_result = cur.fetchone()
        company_name = company_result[0] if company_result else "Customer"
        
        return email, company_name
    finally:
        cur.close()
        conn.close()


def create_custom_pricing_plan(pricing_request_id, user_id, custom_price, 
                               scans_per_month, features, validity_days, 
                               admin_id, approval_notes=None, send_email_approval=True):
    """
    Create a custom pricing plan (admin creates this after approving request)
    Sends approval email to customer with plan details
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Calculate expiry date
        expires_at = datetime.now() + timedelta(days=validity_days)
        
        # Convert features to JSON if it's a list
        if isinstance(features, list):
            features_json = json.dumps(features)
        else:
            features_json = features
        
        cur.execute(
            """
            INSERT INTO custom_pricing_plans 
            (pricing_request_id, user_id, custom_price, scans_per_month, 
             features, validity_days, payment_status, approved_by, 
             approval_notes, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s, %s, %s)
            RETURNING id, expires_at
            """,
            (pricing_request_id, user_id, custom_price, scans_per_month, 
             features_json, validity_days, admin_id, approval_notes, expires_at)
        )
        result = cur.fetchone()
        conn.commit()
        
        if result:
            plan_id = result[0]
            
            # Send approval email to customer (without payment link yet)
            if send_email_approval:
                customer_email, company_name = get_user_email_and_company(user_id)
                if customer_email:
                    # Email will be sent with payment link once admin creates Razorpay order
                    print(f"✅ Custom plan created. Payment link will be sent to {customer_email}")
            
            return {
                "success": True,
                "plan_id": plan_id,
                "expires_at": result[1],
                "message": "✅ Custom pricing plan created successfully"
            }
        else:
            return {"success": False, "message": "Failed to create custom pricing plan"}
            
    except Exception as e:
        print(f"❌ Error creating custom pricing plan: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        cur.close()
        conn.close()


def create_razorpay_order(plan_id, razorpay_order_id, payment_link, send_email=True):
    """
    Update custom pricing plan with Razorpay order details
    Sends payment link email to customer
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Get plan details first
        cur.execute(
            """
            SELECT user_id, custom_price FROM custom_pricing_plans WHERE id = %s
            """,
            (plan_id,)
        )
        plan_result = cur.fetchone()
        
        if not plan_result:
            return {"success": False, "message": "Plan not found"}
        
        user_id, custom_price = plan_result
        
        cur.execute(
            """
            UPDATE custom_pricing_plans
            SET razorpay_order_id = %s, payment_link = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
            """,
            (razorpay_order_id, payment_link, plan_id)
        )
        result = cur.fetchone()
        conn.commit()
        
        if result:
            # Send payment link email to customer
            if send_email:
                customer_email, company_name = get_user_email_and_company(user_id)
                if customer_email:
                    send_payment_link_email(customer_email, company_name, custom_price, payment_link)
            
            return {"success": True, "message": "✅ Razorpay order linked. Payment link sent to customer."}
        else:
            return {"success": False, "message": "Plan not found"}
            
    except Exception as e:
        print(f"❌ Error linking Razorpay order: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        cur.close()
        conn.close()


def get_custom_plan_by_id(plan_id):
    """
    Get custom pricing plan details
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT 
                id, pricing_request_id, user_id, custom_price, scans_per_month,
                features, validity_days, payment_status, razorpay_order_id,
                razorpay_payment_id, payment_link, created_at, updated_at,
                expires_at, approved_by, approval_notes
            FROM custom_pricing_plans
            WHERE id = %s
            """,
            (plan_id,)
        )
        plan = cur.fetchone()
        
        if not plan:
            return None
        
        return {
            "id": plan[0],
            "pricing_request_id": plan[1],
            "user_id": plan[2],
            "custom_price": float(plan[3]),
            "scans_per_month": plan[4],
            "features": json.loads(plan[5]) if plan[5] else [],
            "validity_days": plan[6],
            "payment_status": plan[7],
            "razorpay_order_id": plan[8],
            "razorpay_payment_id": plan[9],
            "payment_link": plan[10],
            "created_at": plan[11],
            "updated_at": plan[12],
            "expires_at": plan[13],
            "approved_by": plan[14],
            "approval_notes": plan[15]
        }
        
    except Exception as e:
        print(f"❌ Error fetching custom plan: {e}")
        return None
    finally:
        cur.close()
        conn.close()


def get_user_custom_plans(user_id):
    """
    Get all custom pricing plans for a user
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT 
                id, custom_price, scans_per_month, features, validity_days,
                payment_status, created_at, expires_at
            FROM custom_pricing_plans
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )
        plans = cur.fetchall()
        
        result = []
        for plan in plans:
            result.append({
                "id": plan[0],
                "custom_price": float(plan[1]),
                "scans_per_month": plan[2],
                "features": json.loads(plan[3]) if plan[3] else [],
                "validity_days": plan[4],
                "payment_status": plan[5],
                "created_at": plan[6],
                "expires_at": plan[7]
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching user custom plans: {e}")
        return []
    finally:
        cur.close()
        conn.close()


def update_payment_status(plan_id, payment_status, razorpay_payment_id=None, send_email=True):
    """
    Update payment status for custom plan
    Sends payment confirmation email if payment is successful
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Get plan details first
        cur.execute(
            """
            SELECT user_id, custom_price, expires_at FROM custom_pricing_plans WHERE id = %s
            """,
            (plan_id,)
        )
        plan_result = cur.fetchone()
        
        if not plan_result:
            return {"success": False, "message": "Plan not found"}
        
        user_id, custom_price, expires_at = plan_result
        
        if razorpay_payment_id:
            cur.execute(
                """
                UPDATE custom_pricing_plans
                SET payment_status = %s, razorpay_payment_id = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (payment_status, razorpay_payment_id, plan_id)
            )
        else:
            cur.execute(
                """
                UPDATE custom_pricing_plans
                SET payment_status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (payment_status, plan_id)
            )
        
        result = cur.fetchone()
        conn.commit()
        
        if result:
            # Send confirmation email if payment is successful
            if payment_status == 'paid' and send_email:
                customer_email, company_name = get_user_email_and_company(user_id)
                if customer_email:
                    expires_date_str = expires_at.strftime("%B %d, %Y") if expires_at else "TBD"
                    send_payment_confirmation_email(customer_email, company_name, plan_id, 
                                                   custom_price, expires_date_str)
            
            return {"success": True, "message": f"✅ Payment status updated to {payment_status}"}
        else:
            return {"success": False, "message": "Plan not found"}
            
    except Exception as e:
        print(f"❌ Error updating payment status: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        cur.close()
        conn.close()


def get_pending_custom_plans():
    """
    Get all pending custom plans waiting for payment (for admin dashboard)
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT 
                cpp.id, cpp.user_id, cpp.custom_price, cpp.scans_per_month,
                cpp.payment_status, cpp.created_at, u.email, u.username,
                pr.company_name
            FROM custom_pricing_plans cpp
            JOIN users u ON cpp.user_id = u.id
            JOIN pricing_requests pr ON cpp.pricing_request_id = pr.id
            WHERE cpp.payment_status != 'paid'
            ORDER BY cpp.created_at DESC
            """
        )
        plans = cur.fetchall()
        
        result = []
        for plan in plans:
            result.append({
                "id": plan[0],
                "user_id": plan[1],
                "custom_price": float(plan[2]),
                "scans_per_month": plan[3],
                "payment_status": plan[4],
                "created_at": plan[5],
                "customer_email": plan[6],
                "customer_name": plan[7],
                "company_name": plan[8]
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching pending custom plans: {e}")
        return []
    finally:
        cur.close()
        conn.close()
