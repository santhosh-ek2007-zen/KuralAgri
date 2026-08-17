from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.models import (
    RoleEnum, ZoneEnum, AccessChannelEnum, BuyerTypeEnum,
    GradeEnum, ListingStatusEnum, OrderStatusEnum, ItemStatusEnum,
    EscrowStatusEnum, ActorTypeEnum, ReputationEventEnum
)

# Auth Schemas
class UserRegister(BaseModel):
    email: str
    password: str
    role: RoleEnum = RoleEnum.FARMER
    name: str
    phone: str
    zone: ZoneEnum = ZoneEnum.PLAINS_A
    # Farmer specific
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    access_channel: Optional[AccessChannelEnum] = AccessChannelEnum.APP
    registered_via_csc_operator: Optional[str] = None
    # Buyer specific
    buyer_type: Optional[BuyerTypeEnum] = BuyerTypeEnum.RETAILER

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Farmer & Buyer Schemas
class FarmerOut(BaseModel):
    id: int
    user_id: Optional[int]
    name: str
    phone: str
    latitude: float
    longitude: float
    zone: ZoneEnum
    access_channel: AccessChannelEnum
    reputation_score: int
    registered_via_csc_operator: Optional[str]

    class Config:
        from_attributes = True

class BuyerOut(BaseModel):
    id: int
    user_id: Optional[int]
    name: str
    phone: Optional[str]
    buyer_type: BuyerTypeEnum
    zone: ZoneEnum
    reputation_score: int

    class Config:
        from_attributes = True

# Aggregation Point Schemas
class AggregationPointOut(BaseModel):
    id: int
    name: str
    zone: ZoneEnum
    latitude: float
    longitude: float
    daily_listing_capacity: int
    is_active: bool
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True

# Crop Listing Schemas
class CropListingCreate(BaseModel):
    farmer_id: Optional[int] = None # Filled from logged-in user or param for CSC/IVR
    crop_name: str
    quantity_kg: float = Field(gt=0)
    harvest_date: Optional[date] = None
    declared_grade: GradeEnum = GradeEnum.A
    suggested_price: Optional[float] = None
    final_price: float = Field(gt=0)
    zone: Optional[ZoneEnum] = None
    photo_url: Optional[str] = None
    registered_via_csc_operator: Optional[str] = None

class CropListingUpdate(BaseModel):
    final_price: Optional[float] = None
    quantity_kg: Optional[float] = None
    status: Optional[ListingStatusEnum] = None

class CropListingOut(BaseModel):
    id: int
    farmer_id: int
    farmer_name: Optional[str] = None
    farmer_phone: Optional[str] = None
    farmer_reputation: Optional[int] = 0
    crop_name: str
    quantity_kg: float
    harvest_date: date
    declared_grade: GradeEnum
    photo_url: Optional[str]
    ai_grade_estimate: Optional[str]
    suggested_price: float
    final_price: float
    zone: ZoneEnum
    aggregation_point_id: int
    aggregation_point_name: Optional[str] = None
    status: ListingStatusEnum
    created_at: datetime

    class Config:
        from_attributes = True

class AggregationPointCatalog(BaseModel):
    aggregation_point: AggregationPointOut
    listings: List[CropListingOut]
    total_quantity_kg: float
    farmers_count: int

# Order & Cart Schemas
class OrderItemCreate(BaseModel):
    listing_id: int
    quantity_kg: float = Field(gt=0)

class OrderCreate(BaseModel):
    buyer_id: Optional[int] = None # Taken from current user if authenticated
    items: List[OrderItemCreate]
    preferred_aggregation_point_id: Optional[int] = None

class OrderItemOut(BaseModel):
    id: int
    order_id: int
    listing_id: int
    crop_name: Optional[str] = None
    declared_grade: Optional[str] = None
    farmer_name: Optional[str] = None
    unit_price: Optional[float] = None
    quantity_kg: float
    item_status: ItemStatusEnum
    substitute_for: Optional[str]

    class Config:
        from_attributes = True

class TransactionOut(BaseModel):
    id: int
    order_id: int
    amount: float
    escrow_status: EscrowStatusEnum
    released_at: Optional[datetime]

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    buyer_id: int
    buyer_name: Optional[str] = None
    aggregation_point_id: Optional[int]
    aggregation_point_name: Optional[str] = None
    status: OrderStatusEnum
    qr_code_token: str
    created_at: datetime
    items: List[OrderItemOut]
    transaction: Optional[TransactionOut] = None
    total_amount: Optional[float] = 0.0

    class Config:
        from_attributes = True

# Collection & Dispute Schemas
class ConfirmCollectionRequest(BaseModel):
    qr_token: str

class ConfirmCollectionResponse(BaseModel):
    success: bool
    message: str
    order_id: int
    new_status: OrderStatusEnum
    escrow_status: EscrowStatusEnum
    buyer_reputation_score: int
    farmer_reputations_updated: List[dict]

class DisputeCreate(BaseModel):
    order_item_id: int
    reason: str
    evidence_photo_url: Optional[str] = None

class DisputeOut(BaseModel):
    id: int
    order_item_id: int
    raised_by_id: int
    evidence_photo_url: Optional[str]
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

# Pricing Schema
class PriceSuggestionResponse(BaseModel):
    crop: str
    zone: str
    base_mandi_price: float
    demand_multiplier: float
    suggested_price: float
    range_min: float
    range_max: float
    market_trend: str

# Reputation Schema
class ReputationLogOut(BaseModel):
    id: int
    actor_type: ActorTypeEnum
    actor_id: int
    event: ReputationEventEnum
    score_delta: int
    created_at: datetime

    class Config:
        from_attributes = True

class ReputationSummary(BaseModel):
    actor_type: ActorTypeEnum
    actor_id: int
    name: str
    score: int
    history: List[ReputationLogOut]

# IVR Schemas
class IVRSimulateRequest(BaseModel):
    farmer_phone: str
    crop_code: str # "1" for Tomato, "2" for Onion, etc.
    quantity_kg: float
    price_per_kg: Optional[float] = None
    grade_code: Optional[str] = "1" # 1: A, 2: B, 3: C
    registered_via_csc_operator: Optional[str] = None
