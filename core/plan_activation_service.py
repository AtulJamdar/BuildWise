"""
Plan Activation Service
Handles plan activation, expiry, usage tracking, and renewal logic
"""

from datetime import datetime, timedelta
from db.connection import get_db_connection
import json
from core.issue_service import get_user_email

def activate_plan(plan_id):
    """
    Activate a paid plan
    Sets payment_status to 'paid' and calculates expiry date
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get plan details
        cur.execute("""
            SELECT pricing_request_id, validity_days, created_at 
            FROM custom_pricing_plans 
            WHERE id = %s
        """, (plan_id,))
        
        plan = cur.fetchone()
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        # Calculate expiry date
        created_at = plan[2] if isinstance(plan[2], datetime) else datetime.fromisoformat(str(plan[2]))
        expires_at = created_at + timedelta(days=plan[1])

        # Update plan status
        cur.execute("""
            UPDATE custom_pricing_plans 
            SET payment_status = 'paid', 
                updated_at = NOW(),
                expires_at = %s
            WHERE id = %s
        """, (expires_at, plan_id))

        # Mark pricing request as paid
        cur.execute("""
            UPDATE pricing_requests 
            SET status = 'paid', updated_at = NOW()
            WHERE id = %s
        """, (plan[0], plan_id))

        conn.commit()
        return {
            "success": True,
            "message": "Plan activated successfully",
            "plan_id": plan_id,
            "expires_at": expires_at.isoformat()
        }

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def check_plan_expiry():
    """
    Check and update expired plans
    Should be run periodically (e.g., daily via cron job)
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Find expired plans
        cur.execute("""
            SELECT id, user_id, expires_at 
            FROM custom_pricing_plans 
            WHERE expires_at < NOW() 
            AND payment_status = 'paid'
        """)

        expired_plans = cur.fetchall()

        for plan in expired_plans:
            plan_id, user_id, expires_at = plan

            # Update plan status to expired
            cur.execute("""
                UPDATE custom_pricing_plans 
                SET payment_status = 'expired'
                WHERE id = %s
            """, (plan_id,))

            # Send expiry notification email (can integrate with email_service)
            user_email = get_user_email(user_id)
            # TODO: Send expiry email notification

        conn.commit()
        return {
            "success": True,
            "expired_plans_count": len(expired_plans)
        }

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def record_usage(plan_id, scans_count):
    """
    Record usage for a plan
    Called when scans are completed
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check if plan is active
        cur.execute("""
            SELECT id FROM custom_pricing_plans 
            WHERE id = %s AND payment_status = 'paid' AND expires_at > NOW()
        """, (plan_id,))

        if not cur.fetchone():
            raise ValueError(f"Plan {plan_id} is not active")

        # Record usage
        cur.execute("""
            INSERT INTO plan_usage_tracking (plan_id, scans_count, recorded_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (plan_id, DATE(recorded_at))
            DO UPDATE SET scans_count = plan_usage_tracking.scans_count + %s
        """, (plan_id, scans_count, scans_count))

        conn.commit()
        return {
            "success": True,
            "plan_id": plan_id,
            "scans_recorded": scans_count
        }

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def get_plan_usage_stats(plan_id):
    """
    Get usage statistics for a plan
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get total scans used
        cur.execute("""
            SELECT COALESCE(SUM(scans_count), 0) as total_scans
            FROM plan_usage_tracking
            WHERE plan_id = %s
        """, (plan_id,))

        total_scans = cur.fetchone()[0]

        # Get usage history (last 30 days)
        cur.execute("""
            SELECT DATE(recorded_at) as date, scans_count
            FROM plan_usage_tracking
            WHERE plan_id = %s AND recorded_at >= NOW() - INTERVAL '30 days'
            ORDER BY date DESC
        """, (plan_id,))

        usage_history = []
        for row in cur.fetchall():
            usage_history.append({
                "date": str(row[0]),
                "scans_count": row[1]
            })

        # Get average daily usage
        cur.execute("""
            SELECT COALESCE(AVG(scans_count), 0) as avg_daily
            FROM plan_usage_tracking
            WHERE plan_id = %s AND recorded_at >= NOW() - INTERVAL '30 days'
        """, (plan_id,))

        avg_daily = int(cur.fetchone()[0])

        cur.close()
        return {
            "total_scans": total_scans,
            "avg_daily_scans": avg_daily,
            "usage_history": usage_history
        }

    except Exception as e:
        raise e


def generate_invoice(plan_id, amount, company_name, user_email):
    """
    Generate invoice for payment
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        reference_id = f"INV-{plan_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        cur.execute("""
            INSERT INTO invoices 
            (plan_id, amount, company_name, user_email, reference_id, status, created_at)
            VALUES (%s, %s, %s, %s, %s, 'paid', NOW())
            RETURNING id
        """, (plan_id, amount, company_name, user_email, reference_id))

        invoice_id = cur.fetchone()[0]
        conn.commit()

        return {
            "invoice_id": invoice_id,
            "reference_id": reference_id,
            "amount": amount
        }

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def get_user_invoices(user_id):
    """
    Get all invoices for a user
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT i.id, i.plan_id, i.amount, i.company_name, 
                   i.reference_id, i.status, i.created_at, i.due_date
            FROM invoices i
            JOIN custom_pricing_plans p ON i.plan_id = p.id
            WHERE p.user_id = %s
            ORDER BY i.created_at DESC
        """, (user_id,))

        invoices = []
        for row in cur.fetchall():
            invoices.append({
                "id": row[0],
                "plan_id": row[1],
                "amount": row[2],
                "company_name": row[3],
                "reference_id": row[4],
                "status": row[5],
                "created_at": str(row[6]),
                "due_date": str(row[7]) if row[7] else None
            })

        cur.close()
        return invoices

    except Exception as e:
        raise e


def request_plan_renewal(plan_id, renewal_days):
    """
    Create renewal request for an expiring plan
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get current plan details
        cur.execute("""
            SELECT user_id, custom_price, scans_per_month, expires_at
            FROM custom_pricing_plans
            WHERE id = %s
        """, (plan_id,))

        plan = cur.fetchone()
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        user_id, price, scans_per_month, expires_at = plan

        # Calculate pro-rated cost
        original_validity = 365  # Default
        pro_rated_price = int((price / original_validity) * renewal_days)

        # Create renewal request
        cur.execute("""
            INSERT INTO renewal_requests 
            (plan_id, user_id, renewal_days, pro_rated_price, status, created_at)
            VALUES (%s, %s, %s, %s, 'pending', NOW())
            RETURNING id
        """, (plan_id, user_id, renewal_days, pro_rated_price))

        renewal_id = cur.fetchone()[0]
        conn.commit()

        return {
            "renewal_id": renewal_id,
            "plan_id": plan_id,
            "renewal_days": renewal_days,
            "amount": pro_rated_price
        }

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()
