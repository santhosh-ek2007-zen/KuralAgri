import os
import asyncio
from datetime import date, datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal, init_db
from app.models import (
    User, Farmer, Buyer, AggregationPoint, CropListing, Order, OrderItem,
    Transaction, ReputationLog, RoleEnum, ZoneEnum, AccessChannelEnum,
    BuyerTypeEnum, GradeEnum, ListingStatusEnum, OrderStatusEnum,
    ItemStatusEnum, EscrowStatusEnum, ActorTypeEnum, ReputationEventEnum
)
from app.routers.auth import get_password_hash
from app.config import MEDIA_DIR
from PIL import Image, ImageDraw

def create_sample_produce_images():
    """Generates clean placeholder produce sample images if none exist."""
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    
    crops = [
        ("tomato.jpg", (220, 50, 40), "Fresh Country Tomatoes"),
        ("onion.jpg", (170, 70, 120), "Nashik Red Onions"),
        ("potato.jpg", (200, 160, 100), "Farm Fresh Potatoes"),
        ("carrot.jpg", (240, 100, 20), "Ooty Hill Carrots"),
        ("chilli.jpg", (40, 180, 50), "Green Hot Chillies"),
        ("cabbage.jpg", (130, 210, 110), "Crisp Green Cabbage"),
        ("dispute_blemish.jpg", (120, 100, 70), "Produce Blemish Evidence")
    ]
    
    for filename, color, label in crops:
        filepath = MEDIA_DIR / filename
        if not filepath.exists():
            img = Image.new("RGB", (400, 300), color=color)
            draw = ImageDraw.Draw(img)
            # Draw decorative badge / gradient feel
            draw.rectangle([20, 20, 380, 280], outline=(255, 255, 255), width=3)
            img.save(filepath, quality=90)


async def seed_data():
    await init_db()
    create_sample_produce_images()

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(AggregationPoint))
        if res.scalars().first():
            print("Database already contains data. Skipping initial seeding.")
            return

        print("Seeding KuralAgri database...")

        # 1. Create Aggregation Points
        agg_points = [
            AggregationPoint(
                name="Thiruvallur CSC Aggregation Point",
                zone=ZoneEnum.PLAINS_A,
                latitude=13.1438,
                longitude=79.9082,
                daily_listing_capacity=150,
                is_active=True
            ),
            AggregationPoint(
                name="Kanchipuram Farmers Hub",
                zone=ZoneEnum.PLAINS_A,
                latitude=12.8342,
                longitude=79.7036,
                daily_listing_capacity=200,
                is_active=True
            ),
            AggregationPoint(
                name="Ooty Nilgiri Cold Aggregation Center",
                zone=ZoneEnum.HILLS_B,
                latitude=11.4102,
                longitude=76.6950,
                daily_listing_capacity=100,
                is_active=True
            ),
            AggregationPoint(
                name="Kodaikanal Valley Produce Station",
                zone=ZoneEnum.HILLS_B,
                latitude=10.2381,
                longitude=77.4892,
                daily_listing_capacity=120,
                is_active=True
            )
        ]
        db.add_all(agg_points)
        await db.flush()

        # 2. Create Farmers & Users
        farmers_data = [
            # Plains Farmers (Thiruvallur / Kanchipuram)
            {"name": "Murugan Palanisamy", "email": "murugan@kuralagri.in", "phone": "9840112345", "lat": 13.1380, "lng": 79.9120, "zone": ZoneEnum.PLAINS_A, "channel": AccessChannelEnum.APP, "csc": None, "rep": 14},
            {"name": "Selvaraj Krishnan", "email": "selvaraj@kuralagri.in", "phone": "9840223456", "lat": 13.1510, "lng": 79.8950, "zone": ZoneEnum.PLAINS_A, "channel": AccessChannelEnum.IVR, "csc": None, "rep": 9},
            {"name": "Lakshmi Ammal", "email": "lakshmi@kuralagri.in", "phone": "9840334567", "lat": 13.1250, "lng": 79.9200, "zone": ZoneEnum.PLAINS_A, "channel": AccessChannelEnum.CSC, "csc": "Vengal CSC Center Operator #4", "rep": 18},
            {"name": "Arumugam Natarajan", "email": "arumugam@kuralagri.in", "phone": "9840445678", "lat": 12.8400, "lng": 79.7100, "zone": ZoneEnum.PLAINS_A, "channel": AccessChannelEnum.APP, "csc": None, "rep": 7},
            {"name": "Dhanapal Vellai", "email": "dhanapal@kuralagri.in", "phone": "9840556789", "lat": 12.8250, "lng": 79.6950, "zone": ZoneEnum.PLAINS_A, "channel": AccessChannelEnum.CSC, "csc": "Walajabad e-Seva Center", "rep": 12},
            
            # Hills Farmers (Ooty / Kodaikanal)
            {"name": "Mani Ramanathan", "email": "mani@kuralagri.in", "phone": "9840667890", "lat": 11.4150, "lng": 76.7020, "zone": ZoneEnum.HILLS_B, "channel": AccessChannelEnum.APP, "csc": None, "rep": 22},
            {"name": "Senthil Kumaran", "email": "senthil@kuralagri.in", "phone": "9840778901", "lat": 11.3980, "lng": 76.6850, "zone": ZoneEnum.HILLS_B, "channel": AccessChannelEnum.IVR, "csc": None, "rep": 15},
            {"name": "Gowri Shankar", "email": "gowri@kuralagri.in", "phone": "9840889012", "lat": 10.2420, "lng": 77.4920, "zone": ZoneEnum.HILLS_B, "channel": AccessChannelEnum.APP, "csc": None, "rep": 11}
        ]

        farmer_models = []
        for fd in farmers_data:
            user = User(
                email=fd["email"],
                hashed_password=get_password_hash("kural123"),
                role=RoleEnum.FARMER
            )
            db.add(user)
            await db.flush()

            farmer = Farmer(
                user_id=user.id,
                name=fd["name"],
                phone=fd["phone"],
                latitude=fd["lat"],
                longitude=fd["lng"],
                zone=fd["zone"],
                access_channel=fd["channel"],
                registered_via_csc_operator=fd["csc"],
                reputation_score=fd["rep"]
            )
            db.add(farmer)
            await db.flush()
            farmer_models.append(farmer)

        # 3. Create Buyers
        buyers_data = [
            {"name": "Saravana Caterers (Babu Rao)", "email": "saravana@caterers.com", "phone": "9940111222", "type": BuyerTypeEnum.CATERER, "zone": ZoneEnum.PLAINS_A, "rep": 25},
            {"name": "Sri Krishna Mens Hostel Mess", "email": "krishna@hostelmess.com", "phone": "9940222333", "type": BuyerTypeEnum.HOSTEL, "zone": ZoneEnum.PLAINS_A, "rep": 19},
            {"name": "Annapoorna Supermarket", "email": "annapoorna@supermarket.com", "phone": "9940333444", "type": BuyerTypeEnum.RETAILER, "zone": ZoneEnum.PLAINS_A, "rep": 32},
            {"name": "Nilgiri Resort & Kitchen", "email": "kitchen@nilgiriresort.com", "phone": "9940444555", "type": BuyerTypeEnum.CATERER, "zone": ZoneEnum.HILLS_B, "rep": 14}
        ]

        buyer_models = []
        for bd in buyers_data:
            user = User(
                email=bd["email"],
                hashed_password=get_password_hash("kural123"),
                role=RoleEnum.BUYER
            )
            db.add(user)
            await db.flush()

            buyer = Buyer(
                user_id=user.id,
                name=bd["name"],
                phone=bd["phone"],
                buyer_type=bd["type"],
                zone=bd["zone"],
                reputation_score=bd["rep"]
            )
            db.add(buyer)
            await db.flush()
            buyer_models.append(buyer)

        # 4. Create Crop Listings at Aggregation Points
        listings_seed = [
            # At Thiruvallur Point (Point 0) - Plains A
            {"farmer": farmer_models[0], "point": agg_points[0], "crop": "Tomato", "qty": 180.0, "grade": GradeEnum.A, "photo": "/media/tomato.jpg", "ai": "Grade A — Premium quality, vibrant color (Brightness 128.4, Variance 42.1)", "sug": 28.0, "final": 28.0, "zone": ZoneEnum.PLAINS_A},
            {"farmer": farmer_models[1], "point": agg_points[0], "crop": "Onion", "qty": 250.0, "grade": GradeEnum.A, "photo": "/media/onion.jpg", "ai": "Grade A — Standard Inspection Pass", "sug": 33.6, "final": 34.0, "zone": ZoneEnum.PLAINS_A},
            {"farmer": farmer_models[2], "point": agg_points[0], "crop": "Chilli", "qty": 45.0, "grade": GradeEnum.A, "photo": "/media/chilli.jpg", "ai": "Grade A — High capsaicin color uniformity", "sug": 57.0, "final": 58.0, "zone": ZoneEnum.PLAINS_A},
            
            # At Kanchipuram Hub (Point 1) - Plains A
            {"farmer": farmer_models[3], "point": agg_points[1], "crop": "Tomato", "qty": 120.0, "grade": GradeEnum.B, "photo": "/media/tomato.jpg", "ai": "Grade B — Good commercial quality, minor size variance", "sug": 28.0, "final": 26.0, "zone": ZoneEnum.PLAINS_A},
            {"farmer": farmer_models[4], "point": agg_points[1], "crop": "Cabbage", "qty": 300.0, "grade": GradeEnum.A, "photo": "/media/cabbage.jpg", "ai": "Grade A — High firmness score 94%", "sug": 22.0, "final": 22.0, "zone": ZoneEnum.PLAINS_A},

            # At Ooty Nilgiri Cold Center (Point 2) - Hills B (Carrots, Potatoes surplus)
            {"farmer": farmer_models[5], "point": agg_points[2], "crop": "Carrot", "qty": 500.0, "grade": GradeEnum.A, "photo": "/media/carrot.jpg", "ai": "Grade A — Nilgiri Deep Orange Premium (Uniformity 96.2%)", "sug": 38.25, "final": 38.0, "zone": ZoneEnum.HILLS_B},
            {"farmer": farmer_models[6], "point": agg_points[2], "crop": "Potato", "qty": 400.0, "grade": GradeEnum.A, "photo": "/media/potato.jpg", "ai": "Grade A — Clean Hill Cultivar", "sug": 21.6, "final": 22.0, "zone": ZoneEnum.HILLS_B},

            # At Kodaikanal Station (Point 3) - Hills B
            {"farmer": farmer_models[7], "point": agg_points[3], "crop": "Carrot", "qty": 350.0, "grade": GradeEnum.B, "photo": "/media/carrot.jpg", "ai": "Grade B — Good flavor, slight shape irregularity", "sug": 38.25, "final": 36.0, "zone": ZoneEnum.HILLS_B}
        ]

        created_listings = []
        for ls in listings_seed:
            listing = CropListing(
                farmer_id=ls["farmer"].id,
                crop_name=ls["crop"],
                quantity_kg=ls["qty"],
                harvest_date=date.today(),
                declared_grade=ls["grade"],
                photo_url=ls["photo"],
                ai_grade_estimate=ls["ai"],
                suggested_price=ls["sug"],
                final_price=ls["final"],
                zone=ls["zone"],
                aggregation_point_id=ls["point"].id,
                status=ListingStatusEnum.AVAILABLE
            )
            db.add(listing)
            await db.flush()
            created_listings.append(listing)

        # 5. Add a Completed Sample Order to show historical Escrow payout & Reputation
        sample_order = Order(
            buyer_id=buyer_models[0].id,
            aggregation_point_id=agg_points[0].id,
            status=OrderStatusEnum.COLLECTED,
            qr_code_token="KURAL-DEMO-SAMPLE01",
            created_at=datetime.utcnow()
        )
        db.add(sample_order)
        await db.flush()

        order_item = OrderItem(
            order_id=sample_order.id,
            listing_id=created_listings[0].id,
            quantity_kg=50.0,
            item_status=ItemStatusEnum.MATCHED,
            substitute_for=None
        )
        db.add(order_item)

        tx = Transaction(
            order_id=sample_order.id,
            amount=1400.0,
            escrow_status=EscrowStatusEnum.RELEASED,
            released_at=datetime.utcnow()
        )
        db.add(tx)

        # Log reputation
        db.add(ReputationLog(
            actor_type=ActorTypeEnum.BUYER,
            actor_id=buyer_models[0].id,
            event=ReputationEventEnum.COMPLETED,
            score_delta=1
        ))
        db.add(ReputationLog(
            actor_type=ActorTypeEnum.FARMER,
            actor_id=farmer_models[0].id,
            event=ReputationEventEnum.COMPLETED,
            score_delta=1
        ))

        await db.commit()
        print("Database successfully seeded with Points, Farmers, Buyers, Listings, and Escrow Transactions!")

if __name__ == "__main__":
    asyncio.run(seed_data())
