import uuid
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt

from app.database import get_db
from app.config import settings
from app.models import User, Farmer, Buyer, RoleEnum, ZoneEnum, AccessChannelEnum, BuyerTypeEnum
from app.schemas import UserRegister, UserLogin, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_password_hash(password: str) -> str:
    salt = secrets.token_hex(8)
    pwd_hash = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}${pwd_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if "$" not in hashed_password:
        return plain_password == hashed_password
    try:
        salt, pwd_hash = hashed_password.split("$", 1)
        expected = hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
        return secrets.compare_digest(pwd_hash, expected)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    result = await db.execute(select(User).where(User.id == int(user_id)))
    return result.scalar_one_or_none()


@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if user email already exists
    existing = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email.lower().strip(),
        hashed_password=get_password_hash(req.password),
        role=req.role
    )
    db.add(user)
    await db.flush()

    profile_id = None
    if req.role == RoleEnum.FARMER:
        # Default coordinates around Thiruvallur / Plains if not provided
        lat = req.latitude if req.latitude is not None else 13.1438
        lng = req.longitude if req.longitude is not None else 79.9082
        farmer = Farmer(
            user_id=user.id,
            name=req.name,
            phone=req.phone,
            latitude=lat,
            longitude=lng,
            zone=req.zone or ZoneEnum.PLAINS_A,
            access_channel=req.access_channel or AccessChannelEnum.APP,
            registered_via_csc_operator=req.registered_via_csc_operator,
            reputation_score=0
        )
        db.add(farmer)
        await db.flush()
        profile_id = farmer.id
    elif req.role == RoleEnum.BUYER:
        buyer = Buyer(
            user_id=user.id,
            name=req.name,
            phone=req.phone,
            buyer_type=req.buyer_type or BuyerTypeEnum.RETAILER,
            zone=req.zone or ZoneEnum.PLAINS_A,
            reputation_score=0
        )
        db.add(buyer)
        await db.flush()
        profile_id = buyer.id

    await db.commit()
    await db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "profile_id": profile_id,
            "name": req.name,
            "zone": req.zone
        }
    }


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Fetch profile details
    name = user.email.split("@")[0]
    zone = "PLAINS_A"
    profile_id = None

    if user.role == RoleEnum.FARMER:
        res = await db.execute(select(Farmer).where(Farmer.user_id == user.id))
        farmer = res.scalar_one_or_none()
        if farmer:
            profile_id = farmer.id
            name = farmer.name
            zone = farmer.zone.value
    elif user.role == RoleEnum.BUYER:
        res = await db.execute(select(Buyer).where(Buyer.user_id == user.id))
        buyer = res.scalar_one_or_none()
        if buyer:
            profile_id = buyer.id
            name = buyer.name
            zone = buyer.zone.value

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "profile_id": profile_id,
            "name": name,
            "zone": zone
        }
    }


@router.get("/me")
async def get_me(current_user: Optional[User] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    profile_data = {}
    if current_user.role == RoleEnum.FARMER:
        res = await db.execute(select(Farmer).where(Farmer.user_id == current_user.id))
        farmer = res.scalar_one_or_none()
        if farmer:
            profile_data = {
                "farmer_id": farmer.id,
                "name": farmer.name,
                "phone": farmer.phone,
                "zone": farmer.zone.value,
                "reputation_score": farmer.reputation_score,
                "latitude": farmer.latitude,
                "longitude": farmer.longitude
            }
    elif current_user.role == RoleEnum.BUYER:
        res = await db.execute(select(Buyer).where(Buyer.user_id == current_user.id))
        buyer = res.scalar_one_or_none()
        if buyer:
            profile_data = {
                "buyer_id": buyer.id,
                "name": buyer.name,
                "phone": buyer.phone,
                "buyer_type": buyer.buyer_type.value,
                "zone": buyer.zone.value,
                "reputation_score": buyer.reputation_score
            }

    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "profile": profile_data
    }
