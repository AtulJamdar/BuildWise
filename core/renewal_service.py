"""
Renewal Service
Handles plan renewal requests, pro-rated pricing calculation, and renewal payment processing.
"""

import os
import requests
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import text
from utils.email_service import send_renewal_offer_email, send_renewal_confirmation_email
from core.db_utils import get_connection

logger = logging.getLogger(__name__)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_SECRET_KEY = os.getenv("RAZORPAY_SECRET_KEY", "")


def calculate_pro_rated_price(original_price: float, original_days: int, renewal_days: int) -> float:
    """
    Calculate pro-rated price for renewal based on days selected.
    
    Args:
        original_price: Original plan price
        original_days: Original plan validity in days
        renewal_days: Number of days for renewal
    
    Returns:
        Pro-rated price for renewal period
    """
    try:
        daily_rate = Decimal(str(original_price)) / Decimal(str(original_days))
        pro_rated = daily_rate * Decimal(str(renewal_days))
        return float(pro_rated.quantize(Decimal("0.01")))
    except Exception as e:
        logger.error(f"Error calculating pro-rated price: {str(e)}")
        raise


def get_plan_expiry_date(plan_id: int) -> dict:
    """
    Get plan expiry date and calculate days until expiry.
    
    Args:
        plan_id: Plan ID
    
    Returns:
        Dictionary with expiry_date and days_until_expiry
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = text("""
            SELECT expires_at FROM custom_pricing_plans WHERE id = :plan_id
        """)
        cursor.execute(query, {"plan_id": plan_id})
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise ValueError(f"Plan {plan_id} not found")
        
        expires_at = result[0]
        days_until_expiry = (expires_at - datetime.utcnow()).days
        
        return {
            "expiry_date": expires_at,
            "days_until_expiry": days_until_expiry,
            "is_expired": days_until_expiry < 0
        }
    except Exception as e:
        logger.error(f"Error getting plan expiry date: {str(e)}")
        raise


def create_renewal_request(plan_id: int, user_id: int, renewal_days: int) -> dict:
    """
    Create a new renewal request for an existing plan.
    
    Args:
        plan_id: Plan ID to renew
        user_id: User requesting renewal
        renewal_days: Number of days for renewal
    
    Returns:
        Renewal request with payment link
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get plan details
        query = text("""
            SELECT custom_price, scans_per_month, features, validity_days
            FROM custom_pricing_plans WHERE id = :plan_id AND user_id = :user_id
        """)
        cursor.execute(query, {"plan_id": plan_id, "user_id": user_id})
        plan = cursor.fetchone()
        
        if not plan:
            raise ValueError(f"Plan {plan_id} not found for user {user_id}")
        
        custom_price, scans_per_month, features, validity_days = plan
        
        # Calculate pro-rated price
        pro_rated_price = calculate_pro_rated_price(custom_price, validity_days, renewal_days)
        
        # Create renewal request in database
        insert_query = text("""
            INSERT INTO renewal_requests (plan_id, user_id, renewal_days, pro_rated_price, status, created_at, updated_at)
            VALUES (:plan_id, :user_id, :renewal_days, :pro_rated_price, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """)
        cursor.execute(insert_query, {
            "plan_id": plan_id,
            "user_id": user_id,
            "renewal_days": renewal_days,
            "pro_rated_price": pro_rated_price
        })
        renewal_id = cursor.fetchone()[0]
        conn.commit()
        
        # Create Razorpay order for renewal payment
        order_data = create_razorpay_order_for_renewal(
            renewal_id, pro_rated_price, user_id
        )
        
        # Update renewal request with order details
        update_query = text("""
            UPDATE renewal_requests 
            SET razorpay_order_id = :order_id, payment_link = :payment_link, updated_at = CURRENT_TIMESTAMP
            WHERE id = :renewal_id
        """)
        cursor.execute(update_query, {
            "renewal_id": renewal_id,
            "order_id": order_data["order_id"],
            "payment_link": order_data["payment_link"]
        })
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Renewal request created: {renewal_id} for plan {plan_id}")
        
        return {
            "renewal_id": renewal_id,
            "plan_id": plan_id,
            "renewal_days": renewal_days,
            "pro_rated_price": pro_rated_price,
            "order_id": order_data["order_id"],
            "payment_link": order_data["payment_link"]
        }
    except Exception as e:
        logger.error(f"Error creating renewal request: {str(e)}")
        raise


def create_razorpay_order_for_renewal(renewal_id: int, amount: float, user_id: int) -> dict:
    """
    Create Razorpay order for renewal payment.
    
    Args:
        renewal_id: Renewal request ID
        amount: Amount to charge (in rupees)
        user_id: User ID for reference
    
    Returns:
        Razorpay order details
    """
    try:
        url = "https://api.razorpay.com/v1/orders"
        amount_paise = int(amount * 100)
        
        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"renewal_{renewal_id}",
            "notes": {
                "renewal_id": renewal_id,
                "user_id": user_id,
                "type": "plan_renewal"
            }
        }
        
        response = requests.post(
            url,
            json=payload,
            auth=(RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY),
            timeout=10
        )
        
        if response.status_code != 200:
            raise Exception(f"Razorpay error: {response.text}")
        
        order = response.json()
        payment_link = f"https://rzp.io/l/{order['id']}"
        
        return {
            "order_id": order["id"],
            "payment_link": payment_link,
            "amount": amount
        }
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {str(e)}")
        raise


def update_renewal_payment_status(renewal_id: int, razorpay_payment_id: str, status: str) -> dict:
    """
    Update renewal request payment status after successful payment.
    
    Args:
        renewal_id: Renewal request ID
        razorpay_payment_id: Razorpay payment ID
        status: Payment status (paid/failed/cancelled)
    
    Returns:
        Updated renewal request details
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update renewal request status
        update_query = text("""
            UPDATE renewal_requests 
            SET razorpay_payment_id = :payment_id, status = :status, updated_at = CURRENT_TIMESTAMP
            WHERE id = :renewal_id
        """)
        cursor.execute(update_query, {
            "renewal_id": renewal_id,
            "payment_id": razorpay_payment_id,
            "status": status
        })
        conn.commit()
        
        # Get renewal details for response
        get_query = text("""
            SELECT plan_id, user_id, pro_rated_price, renewal_days FROM renewal_requests WHERE id = :renewal_id
        """)
        cursor.execute(get_query, {"renewal_id": renewal_id})
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise ValueError(f"Renewal {renewal_id} not found")
        
        plan_id, user_id, price, renewal_days = result
        
        logger.info(f"Renewal payment updated: {renewal_id} status={status}")
        
        return {
            "renewal_id": renewal_id,
            "plan_id": plan_id,
            "user_id": user_id,
            "status": status,
            "price": price,
            "renewal_days": renewal_days
        }
    except Exception as e:
        logger.error(f"Error updating renewal payment status: {str(e)}")
        raise


def activate_renewal_plan(renewal_id: int) -> dict:
    """
    Activate renewed plan after successful payment.
    Extends the expires_at date of the original plan.
    
    Args:
        renewal_id: Renewal request ID
    
    Returns:
        Updated plan details with new expiry date
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get renewal and plan details
        query = text("""
            SELECT r.plan_id, r.renewal_days, r.pro_rated_price
            FROM renewal_requests r
            WHERE r.id = :renewal_id AND r.status = 'paid'
        """)
        cursor.execute(query, {"renewal_id": renewal_id})
        result = cursor.fetchone()
        
        if not result:
            raise ValueError(f"Renewal {renewal_id} not found or payment not complete")
        
        plan_id, renewal_days, price = result
        
        # Calculate new expiry date
        new_expiry = datetime.utcnow() + timedelta(days=renewal_days)
        
        # Update plan with new expiry date
        update_query = text("""
            UPDATE custom_pricing_plans 
            SET expires_at = :new_expiry, updated_at = CURRENT_TIMESTAMP
            WHERE id = :plan_id
        """)
        cursor.execute(update_query, {
            "plan_id": plan_id,
            "new_expiry": new_expiry
        })
        conn.commit()
        
        # Create invoice for renewal
        invoice_query = text("""
            INSERT INTO invoices (plan_id, amount, invoice_date, due_date, status, notes)
            VALUES (:plan_id, :amount, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 'paid', 'Plan Renewal')
            RETURNING id
        """)
        cursor.execute(invoice_query, {
            "plan_id": plan_id,
            "amount": price
        })
        invoice_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.close()
        conn.close()
        
        logger.info(f"Renewal activated: {renewal_id} new expiry: {new_expiry}")
        
        return {
            "renewal_id": renewal_id,
            "plan_id": plan_id,
            "new_expiry": new_expiry,
            "renewal_days": renewal_days,
            "invoice_id": invoice_id
        }
    except Exception as e:
        logger.error(f"Error activating renewal plan: {str(e)}")
        raise


def get_renewal_requests_by_user(user_id: int) -> list:
    """
    Get all renewal requests for a user.
    
    Args:
        user_id: User ID
    
    Returns:
        List of renewal requests
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = text("""
            SELECT id, plan_id, renewal_days, pro_rated_price, status, 
                   razorpay_order_id, payment_link, created_at, updated_at
            FROM renewal_requests 
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """)
        cursor.execute(query, {"user_id": user_id})
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        renewals = []
        for row in results:
            renewals.append({
                "renewal_id": row[0],
                "plan_id": row[1],
                "renewal_days": row[2],
                "pro_rated_price": float(row[3]),
                "status": row[4],
                "razorpay_order_id": row[5],
                "payment_link": row[6],
                "created_at": row[7],
                "updated_at": row[8]
            })
        
        return renewals
    except Exception as e:
        logger.error(f"Error getting renewal requests: {str(e)}")
        raise


def cancel_renewal_request(renewal_id: int, user_id: int) -> dict:
    """
    Cancel a renewal request (before payment completion).
    
    Args:
        renewal_id: Renewal request ID
        user_id: User ID for verification
    
    Returns:
        Cancelled renewal details
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify ownership and pending status
        query = text("""
            SELECT status FROM renewal_requests 
            WHERE id = :renewal_id AND user_id = :user_id
        """)
        cursor.execute(query, {"renewal_id": renewal_id, "user_id": user_id})
        result = cursor.fetchone()
        
        if not result:
            raise ValueError(f"Renewal {renewal_id} not found")
        
        if result[0] != "pending":
            raise ValueError(f"Can only cancel pending renewals, current status: {result[0]}")
        
        # Update status to cancelled
        update_query = text("""
            UPDATE renewal_requests 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = :renewal_id
        """)
        cursor.execute(update_query, {"renewal_id": renewal_id})
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Renewal cancelled: {renewal_id}")
        
        return {
            "renewal_id": renewal_id,
            "status": "cancelled"
        }
    except Exception as e:
        logger.error(f"Error cancelling renewal: {str(e)}")
        raise
