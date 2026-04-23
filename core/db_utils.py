"""
Database utility functions to reduce code duplication and standardize access patterns.
Centralizes common database operations used across issue_service and project_service.
"""
from db.connection import get_connection


def execute_query(sql, params=None, fetch_one=False):
    """
    Execute a SELECT query and return results.
    
    Args:
        sql: SQL query string
        params: Query parameters (tuple or list)
        fetch_one: If True, return single row; if False, return all rows
    
    Returns:
        Single row/None if fetch_one=True, otherwise list of rows
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        result = cur.fetchone() if fetch_one else cur.fetchall()
        return result
    finally:
        cur.close()
        conn.close()


def execute_update(sql, params=None, return_id=False):
    """
    Execute INSERT/UPDATE/DELETE query.
    
    Args:
        sql: SQL query string
        params: Query parameters (tuple or list)
        return_id: If True, return the RETURNING value (for RETURNING id queries)
    
    Returns:
        Number of rows affected, or the returned ID if return_id=True
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        if return_id:
            result = cur.fetchone()
            conn.commit()
            return result[0] if result else None
        else:
            conn.commit()
            return cur.rowcount
    except Exception as e:
        print(f"❌ Database error: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def execute_safe(sql, params=None, fetch_one=False, error_msg=None):
    """
    Execute a query with error handling and optional logging.
    
    Args:
        sql: SQL query string
        params: Query parameters (tuple or list)
        fetch_one: If True, return single row; if False, return all rows
        error_msg: Custom error message to print on failure
    
    Returns:
        Query results or empty list/None on error
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        result = cur.fetchone() if fetch_one else cur.fetchall()
        return result
    except Exception as e:
        print(f"❌ {error_msg or 'Database error'}: {e}")
        return None if fetch_one else []
    finally:
        cur.close()
        conn.close()


def verify_access(sql, params, user_id):
    """
    Verify if user has access to a resource.
    
    Args:
        sql: SQL query to check access (should return 1 if access granted)
        params: Query parameters (should include user_id)
    
    Returns:
        True if access granted, False otherwise
    """
    result = execute_query(sql, params, fetch_one=True)
    return result is not None
