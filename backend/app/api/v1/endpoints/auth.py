from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_user
from app.models import Tourist
from app.schemas import LoginRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(form: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authority login with email + password (via Supabase)."""
    from app.core.config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    try:
        resp = supabase.auth.sign_in_with_password(
            {"email": form.email, "password": form.password}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not resp.user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    role = resp.user.app_metadata.get("role", "tourist")
    token = create_access_token(
        data={"sub": resp.user.id, "email": resp.user.email, "role": role}
    )
    return TokenResponse(
        access_token=token,
        role=role,
        user_id=resp.user.id,
    )


@router.post("/otp/send")
async def send_otp(email: str):
    """Send OTP magic link to tourist email."""
    from app.core.config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    try:
        supabase.auth.sign_in_with_otp({"email": email})
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to send OTP")
    return {"message": "OTP sent"}


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(email: str, token: str):
    """Verify tourist OTP and return JWT."""
    from app.core.config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    try:
        resp = supabase.auth.verify_otp({"email": email, "token": token, "type": "email"})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if not resp.user:
        raise HTTPException(status_code=400, detail="Verification failed")

    jwt = create_access_token(
        data={"sub": resp.user.id, "email": resp.user.email, "role": "tourist"}
    )
    return TokenResponse(access_token=jwt, role="tourist", user_id=resp.user.id)


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
