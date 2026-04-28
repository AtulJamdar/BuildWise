import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

# Must be identical to auth.py
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key_change_this")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        # This is the error you were seeing in Postman
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_admin(token: str = Depends(oauth2_scheme)):
    """
    Validate admin JWT token
    Admin tokens use 'sub' field (unlike regular user tokens that use 'user_id')
    """
    print(f"\n{'='*80}")
    print(f"🔐 [TOKEN VALIDATION] START")
    print(f"{'='*80}")
    print(f"📦 Raw token type: {type(token)}")
    print(f"📦 Token value: {token}")
    print(f"📦 Token length: {len(token) if token else 0}")
    
    try:
        if not token:
            print(f"❌ [TOKEN VALIDATION] Token is empty or None!")
            raise HTTPException(status_code=401, detail="No token provided")
        
        print(f"🔓 Attempting to decode JWT...")
        print(f"🔑 SECRET_KEY being used: {SECRET_KEY[:20]}..." if SECRET_KEY else "❌ NO SECRET_KEY")
        print(f"📋 ALGORITHM: {ALGORITHM}")
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"✅ [TOKEN VALIDATION] Token decoded successfully!")
        print(f"🔍 Decoded payload: {payload}")
        
        admin_id: int = payload.get("sub")
        role: str = payload.get("role")
        email: str = payload.get("email")
        
        print(f"📊 Extracted from payload:")
        print(f"   - admin_id (sub): {admin_id}")
        print(f"   - role: {role}")
        print(f"   - email: {email}")
        
        if admin_id is None:
            print(f"❌ [TOKEN VALIDATION] Missing 'sub' field in token!")
            raise HTTPException(status_code=401, detail="Invalid token: missing admin_id")
        
        if role not in ["admin", "super_admin"]:
            print(f"❌ [TOKEN VALIDATION] Role '{role}' not authorized!")
            raise HTTPException(status_code=403, detail=f"User role '{role}' is not authorized for admin access")
        
        print(f"✅ [TOKEN VALIDATION] Admin {admin_id} (role: {role}) AUTHORIZED!")
        print(f"{'='*80}\n")
        return admin_id
        
    except Exception as e:
        print(f"❌ [TOKEN VALIDATION] ERROR: {type(e).__name__}")
        print(f"   Message: {str(e)}")
        print(f"{'='*80}\n")
        
        if isinstance(e, HTTPException):
            raise
        elif isinstance(e, JWTError):
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        else:
            raise HTTPException(
                status_code=401,
                detail=f"Token validation failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )