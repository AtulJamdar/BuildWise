"""
Pricing Request Service
Handles customer custom pricing requests
"""
from datetime import datetime
from db.connection import get_connection
from utils.email_service import (
    send_pricing_request_submitted_email,
    send_pricing_request_approved_email,
    send_pricing_request_rejected_email,
    send_admin_pricing_request_notification
)
import json
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")


def get_user_email(user_id):
    """Get user email from database."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        result = cur.fetchone()
        return result[0] if result else None
    finally:
        cur.close()
        conn.close()


def create_pricing_request(user_id, company_name, team_size, scans_per_month, 
                           specific_features, budget_min, budget_max):
    """
    Create a new pricing request from customer
    Sends confirmation email to customer and notification to admin
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            INSERT INTO pricing_requests 
            (user_id, company_name, team_size, scans_per_month, specific_features, 
             budget_min, budget_max, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
            RETURNING id, created_at
            """,
            (user_id, company_name, team_size, scans_per_month, specific_features, 
             budget_min, budget_max)
        )
        result = cur.fetchone()
        conn.commit()
        
        if result:
            request_id = result[0]
            
            # Send confirmation email to customer
            customer_email = get_user_email(user_id)
            if customer_email:
                send_pricing_request_submitted_email(customer_email, company_name, request_id)
            
            # Send notification to admin
            if ADMIN_EMAIL:
                send_admin_pricing_request_notification(ADMIN_EMAIL, company_name, request_id, 
                                                       team_size, budget_min, budget_max)
            
            return {
                "success": True,
                "request_id": request_id,
                "created_at": result[1],
                "message": "✅ Pricing request submitted successfully. Confirmation email sent."
            }
        else:
            return {"success": False, "message": "Failed to create pricing request"}
            
    except Exception as e:
        print(f"❌ Error creating pricing request: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        cur.close()
        conn.close()


def get_all_pending_requests():
    """
    Get all pending pricing requests (for admin dashboard)
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT 
                pr.id, pr.user_id, pr.company_name, pr.team_size, 
                pr.scans_per_month, pr.specific_features, pr.budget_min, 
                pr.budget_max, pr.status, pr.created_at, u.email, u.username
            FROM pricing_requests pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.status = 'pending'
            ORDER BY pr.created_at DESC
            """
        )
        requests = cur.fetchall()
        
        result = []
        for req in requests:
            result.append({
                "id": req[0],
                "user_id": req[1],
                "company_name": req[2],
                "team_size": req[3],
                "scans_per_month": req[4],
                "specific_features": req[5],
                "budget_min": float(req[6]) if req[6] else None,
                "budget_max": float(req[7]) if req[7] else None,
                "status": req[8],
                "created_at": req[9],
                "customer_email": req[10],
                "customer_name": req[11]
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching pending requests: {e}")
        return []
    finally:
        cur.close()
        conn.close()


def get_pricing_request_by_id(request_id):
    """
    Get a specific pricing request by ID
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT 
                pr.id, pr.user_id, pr.company_name, pr.team_size, 
                pr.scans_per_month, pr.specific_features, pr.budget_min, 
                pr.budget_max, pr.status, pr.created_at, pr.admin_notes, 
                pr.reviewed_by, pr.reviewed_at, u.email, u.username
            FROM pricing_requests pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.id = %s
            """,
            (request_id,)
        )
        req = cur.fetchone()
        
        if not req:
            return None
        
        return {
            "id": req[0],
            "user_id": req[1],
            "company_name": req[2],
            "team_size": req[3],
            "scans_per_month": req[4],
            "specific_features": req[5],
            "budget_min": float(req[6]) if req[6] else None,
            "budget_max": float(req[7]) if req[7] else None,
            "status": req[8],
            "created_at": req[9],
            "admin_notes": req[10],
            "reviewed_by": req[11],
            "reviewed_at": req[12],
            "customer_email": req[13],
            "customer_name": req[14]
        }
        
    except Exception as e:
        print(f"❌ Error fetching pricing request: {e}")
        return None
    finally:
        cur.close()
        conn.close()


def get_user_pricing_requests(user_id):
    """
    Get all pricing requests for a specific user
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT 
                id, company_name, team_size, scans_per_month, 
                specific_features, budget_min, budget_max, status, created_at
            FROM pricing_requests
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )
        requests = cur.fetchall()
        
        result = []
        for req in requests:
            result.append({
                "id": req[0],
                "company_name": req[1],
                "team_size": req[2],
                "scans_per_month": req[3],
                "specific_features": req[4],
                "budget_min": float(req[5]) if req[5] else None,
                "budget_max": float(req[6]) if req[6] else None,
                "status": req[7],
                "created_at": req[8]
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching user pricing requests: {e}")
        return []
    finally:
        cur.close()
        conn.close()


def update_pricing_request_status(request_id, status, admin_id=None, admin_notes=None, 
                                  customer_email=None, company_name=None):
    """
    Update pricing request status (approved/rejected/pending)
    Sends rejection email if status is 'rejected' and customer_email is provided
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        if admin_id and admin_notes:
            cur.execute(
                """
                UPDATE pricing_requests
                SET status = %s, reviewed_by = %s, reviewed_at = CURRENT_TIMESTAMP, 
                    admin_notes = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (status, admin_id, admin_notes, request_id)
            )
        else:
            cur.execute(
                """
                UPDATE pricing_requests
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (status, request_id)
            )
        
        result = cur.fetchone()
        conn.commit()
        
        if result:
            # Send rejection email if status is 'rejected'
            if status == 'rejected' and customer_email and company_name:
                reason = admin_notes if admin_notes else ""
                send_pricing_request_rejected_email(customer_email, company_name, request_id, reason)
            
            return {"success": True, "message": f"Request status updated to {status}"}
        else:
            return {"success": False, "message": "Request not found"}
            
    except Exception as e:
        print(f"❌ Error updating pricing request: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        cur.close()
        conn.close()
