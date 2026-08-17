import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Numeric, Boolean,
    DateTime, Date, ForeignKey, Enum as SQLEnum, Text
)
from sqlalchemy.orm import relationship
from app.database import Base

class RoleEnum(str, enum.Enum):
    FARMER = "FARMER"
    BUYER = "BUYER"
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"

class ZoneEnum(str, enum.Enum):
    PLAINS_A = "PLAINS_A"
    HILLS_B = "HILLS_B"

class AccessChannelEnum(str, enum.Enum):
    APP = "APP"
    IVR = "IVR"
    CSC = "CSC"

class BuyerTypeEnum(str, enum.Enum):
    CATERER = "CATERER"
    HOSTEL = "HOSTEL"
    RETAILER = "RETAILER"
    INDIVIDUAL = "INDIVIDUAL"

class GradeEnum(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"

class ListingStatusEnum(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    SOLD = "SOLD"
    EXPIRED = "EXPIRED"

class OrderStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COLLECTED = "COLLECTED"
    DISPUTED = "DISPUTED"
    CANCELLED = "CANCELLED"

class ItemStatusEnum(str, enum.Enum):
    MATCHED = "MATCHED"
    UNAVAILABLE_IN_ZONE = "UNAVAILABLE_IN_ZONE"
    SUBSTITUTED = "SUBSTITUTED"

class EscrowStatusEnum(str, enum.Enum):
    HELD = "HELD"
    RELEASED = "RELEASED"
    REFUNDED = "REFUNDED"

class ActorTypeEnum(str, enum.Enum):
    FARMER = "FARMER"
    BUYER = "BUYER"

class ReputationEventEnum(str, enum.Enum):
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"
    DISPUTE_RAISED = "DISPUTE_RAISED"
    DISPUTE_UPHELD = "DISPUTE_UPHELD"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.FARMER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    farmer_profile = relationship("Farmer", back_populates="user", uselist=False)
    buyer_profile = relationship("Buyer", back_populates="user", uselist=False)


class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    zone = Column(SQLEnum(ZoneEnum), default=ZoneEnum.PLAINS_A, nullable=False)
    access_channel = Column(SQLEnum(AccessChannelEnum), default=AccessChannelEnum.APP, nullable=False)
    reputation_score = Column(Integer, default=0)
    registered_via_csc_operator = Column(String(255), nullable=True)

    user = relationship("User", back_populates="farmer_profile")
    listings = relationship("CropListing", back_populates="farmer")


class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    buyer_type = Column(SQLEnum(BuyerTypeEnum), default=BuyerTypeEnum.RETAILER, nullable=False)
    zone = Column(SQLEnum(ZoneEnum), default=ZoneEnum.PLAINS_A, nullable=False)
    reputation_score = Column(Integer, default=0)

    user = relationship("User", back_populates="buyer_profile")
    orders = relationship("Order", back_populates="buyer")
    disputes = relationship("Dispute", back_populates="buyer")


class AggregationPoint(Base):
    __tablename__ = "aggregation_points"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    zone = Column(SQLEnum(ZoneEnum), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    daily_listing_capacity = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)

    listings = relationship("CropListing", back_populates="aggregation_point")
    orders = relationship("Order", back_populates="aggregation_point")


class CropListing(Base):
    __tablename__ = "crop_listings"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    crop_name = Column(String(100), nullable=False, index=True)
    quantity_kg = Column(Float, nullable=False)
    harvest_date = Column(Date, default=date.today)
    declared_grade = Column(SQLEnum(GradeEnum), default=GradeEnum.A, nullable=False)
    photo_url = Column(String(500), nullable=True)
    ai_grade_estimate = Column(String(100), nullable=True)
    suggested_price = Column(Float, nullable=False)
    final_price = Column(Float, nullable=False)
    zone = Column(SQLEnum(ZoneEnum), nullable=False, index=True)
    aggregation_point_id = Column(Integer, ForeignKey("aggregation_points.id"), nullable=False)
    status = Column(SQLEnum(ListingStatusEnum), default=ListingStatusEnum.AVAILABLE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    farmer = relationship("Farmer", back_populates="listings")
    aggregation_point = relationship("AggregationPoint", back_populates="listings")
    order_items = relationship("OrderItem", back_populates="listing")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    aggregation_point_id = Column(Integer, ForeignKey("aggregation_points.id"), nullable=True)
    status = Column(SQLEnum(OrderStatusEnum), default=OrderStatusEnum.PENDING, nullable=False)
    qr_code_token = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    buyer = relationship("Buyer", back_populates="orders")
    aggregation_point = relationship("AggregationPoint", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    transaction = relationship("Transaction", back_populates="order", uselist=False, cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    listing_id = Column(Integer, ForeignKey("crop_listings.id"), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    item_status = Column(SQLEnum(ItemStatusEnum), default=ItemStatusEnum.MATCHED, nullable=False)
    substitute_for = Column(String(100), nullable=True)

    order = relationship("Order", back_populates="items")
    listing = relationship("CropListing", back_populates="order_items")
    disputes = relationship("Dispute", back_populates="order_item")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    escrow_status = Column(SQLEnum(EscrowStatusEnum), default=EscrowStatusEnum.HELD, nullable=False)
    released_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="transaction")


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=False)
    raised_by_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    evidence_photo_url = Column(String(500), nullable=True)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    order_item = relationship("OrderItem", back_populates="disputes")
    buyer = relationship("Buyer", back_populates="disputes")


class ReputationLog(Base):
    __tablename__ = "reputation_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_type = Column(SQLEnum(ActorTypeEnum), nullable=False, index=True)
    actor_id = Column(Integer, nullable=False, index=True)
    event = Column(SQLEnum(ReputationEventEnum), nullable=False)
    score_delta = Column(Integer, nullable=False) # e.g. +1 / -1
    created_at = Column(DateTime, default=datetime.utcnow)
