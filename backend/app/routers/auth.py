from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import create_token, get_current_user, hash_password, verify_password
from ..database import get_db
from ..models import User, UserPreference
from ..schemas import LoginIn, ProfileIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Enter a valid email address")
    if len(payload.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists")
    user = User(
        name=payload.name.strip() or "Friend",
        email=email,
        hashed_password=hash_password(payload.password),
        timezone=payload.timezone or "Asia/Kolkata",
    )
    db.add(user)
    db.flush()
    db.add(UserPreference(user_id=user.id))
    db.commit()
    db.refresh(user)
    return {"access_token": create_token(user.id), "token_type": "bearer", "user": user}


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token": create_token(user.id), "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_profile(payload: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field in ("name", "timezone", "avatar_color", "onboarded"):
        value = getattr(payload, field)
        if value is not None:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
