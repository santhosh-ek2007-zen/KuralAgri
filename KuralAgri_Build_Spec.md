# KuralAgri — 4-Day Prototype Build Spec

**Stack (matches pitch deck tech stack):**
- **Access:** Android / Web App · IVR · CSC
- **Backend:** Python + FastAPI · REST APIs
- **Data:** PostgreSQL · Object Storage (for produce photos)
- **AI/ML:** Python · Computer Vision (quality grading) · Price & demand models
- **Services:** Maps/Geolocation (aggregation-point distance calc) · SMS/Voice (IVR)
- **Payments:** Escrow + UPI / Payment Gateway

**Goal:** A working end-to-end demo loop — Farmer lists → auto-assigned to nearest aggregation point → Buyer sees aggregation-point catalog → Order → Buyer travels & collects → QR check-in → Escrow release → Reputation update. IVR, real ML, and real payments are simulated, not built.

**4-day scope note:** The pitch deck's full stack (PostgreSQL, real UPI gateway, full CV pipeline) is the target architecture. For the prototype itself, use PostgreSQL from day one (it's a 10-minute setup difference from SQLite and keeps the demo consistent with what's in the deck), but keep object storage local-disk and the payment gateway simulated — see the Fake-It-Convincingly table in Section 3.

---

## 1. Data Models (SQLAlchemy, for FastAPI)

### `Farmer`
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| user_id | Integer, FK(User) | auth link |
| name | String | |
| phone | String | |
| latitude | Float | needed to compute nearest aggregation point |
| longitude | Float | |
| zone | Enum | e.g. `PLAINS_A`, `HILLS_B` — powers zone-based matching |
| access_channel | Enum | `APP`, `IVR`, `CSC` — for demo storytelling, not logic |
| reputation_score | Integer, default=0 | |
| registered_via_csc_operator | String, nullable | optional, shows CSC-assisted flow |

### `Buyer`
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| user_id | Integer, FK(User) | |
| name | String | |
| buyer_type | Enum | `CATERER`, `HOSTEL`, `RETAILER`, `INDIVIDUAL` |
| zone | Enum | same zone list as Farmer |
| reputation_score | Integer, default=0 | |

### `AggregationPoint`
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| name | String | e.g. "Thiruvallur CSC Point" |
| zone | Enum | matches Farmer/Buyer zone list |
| latitude | Float | for nearest-point calculation |
| longitude | Float | |
| daily_listing_capacity | Integer, default=100 | simple congestion cap |
| is_active | Boolean, default=True | |

Seed 3-5 of these per zone for the demo (real coordinates of CSC centers/panchayat grounds in your pilot area work well and look credible).

### `CropListing`
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| farmer_id | Integer, FK(Farmer) | |
| crop_name | String | e.g. Tomato, Onion, Carrot |
| quantity_kg | Numeric | |
| harvest_date | Date | |
| declared_grade | Enum | `A`, `B`, `C` |
| photo_url | String | stored in Object Storage, triggers "AI grading" placeholder |
| ai_grade_estimate | String, nullable | filled by placeholder CV check |
| suggested_price | Numeric | computed on create |
| final_price | Numeric | farmer can override suggested |
| zone | Enum | inherited from farmer, denormalized for fast filtering |
| aggregation_point_id | Integer, FK(AggregationPoint) | **auto-assigned on create** — nearest active point to `farmer.latitude/longitude`, not chosen by the farmer |
| status | Enum | `AVAILABLE`, `RESERVED`, `SOLD`, `EXPIRED` |
| created_at | DateTime, default=now | |

**Assignment logic (simple, no ML — runs inside the FastAPI create-listing endpoint or a service function):**
```python
import math
from sqlalchemy import select

def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371  # km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat/2)**2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2)
    return R * 2 * math.asin(math.sqrt(a))

async def get_nearest_aggregation_point(db: AsyncSession, farmer: Farmer) -> AggregationPoint:
    result = await db.execute(
        select(AggregationPoint).where(
            AggregationPoint.is_active == True,
            AggregationPoint.zone == farmer.zone,
        )
    )
    points = result.scalars().all()
    return min(points, key=lambda p: haversine_distance(
        farmer.latitude, farmer.longitude, p.latitude, p.longitude
    ))
```
Call this inside the `POST /listings/` route handler when a `CropListing` is created, and store the result — don't recompute it on every read.

### `Order`
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| buyer_id | Integer, FK(Buyer) | |
| aggregation_point_id | Integer, FK(AggregationPoint), nullable | resolved point where the buyer will collect; null if items span multiple points |
| status | Enum | `PENDING`, `CONFIRMED`, `COLLECTED`, `DISPUTED`, `CANCELLED` |
| qr_code_token | String, unique | generated on order creation |
| created_at | DateTime, default=now | |

### `OrderItem`
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| order_id | Integer, FK(Order) | |
| listing_id | Integer, FK(CropListing) | |
| quantity_kg | Numeric | |
| item_status | Enum | `MATCHED`, `UNAVAILABLE_IN_ZONE`, `SUBSTITUTED` |
| substitute_for | String, nullable | e.g. "Carrot" if substituted with Radish |

### `Transaction` (escrow simulation)
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| order_id | Integer, FK(Order), unique | |
| amount | Numeric | |
| escrow_status | Enum | `HELD`, `RELEASED`, `REFUNDED` |
| released_at | DateTime, nullable | |

### `Dispute`
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| order_item_id | Integer, FK(OrderItem) | |
| raised_by_id | Integer, FK(Buyer) | |
| evidence_photo_url | String | stored in Object Storage |
| reason | Text | |
| created_at | DateTime, default=now | |

### `ReputationLog`
| Field | Type | Notes |
|---|---|---|
| id | Integer, PK | |
| actor_type | Enum | `FARMER` / `BUYER` |
| actor_id | Integer | |
| event | Enum | `COMPLETED`, `NO_SHOW`, `DISPUTE_RAISED`, `DISPUTE_UPHELD` |
| score_delta | Integer | +1 / -1 |
| created_at | DateTime, default=now | |

---

## 2. API Endpoints (FastAPI, REST)

### Auth
- `POST /api/auth/register` — role param: farmer / buyer
- `POST /api/auth/login` — JWT token auth

### Farmer
- `POST /api/listings` — create listing (photo upload to Object Storage triggers placeholder grading + nearest-aggregation-point assignment)
- `GET /api/listings/mine` — farmer's own listings
- `PATCH /api/listings/{id}` — edit price/status

### Aggregation Points
- `GET /api/aggregation-points?zone=<zone>` — list active points in a zone
- `GET /api/aggregation-points/{id}/listings` — everything currently available to collect at that one point (this is what the buyer actually browses)

### Buyer
- `GET /api/listings/browse?zone=<zone>&crop=<crop>` — zone-filtered catalog, grouped by aggregation point (core "accessibility" demo)
- `POST /api/orders` — create multi-item order; server tries to resolve all items to **one** aggregation point where possible, auto-marks items `UNAVAILABLE_IN_ZONE` (no point nearby carries it) or suggests `SUBSTITUTED`; `Order` stores the resolved `aggregation_point`
- `GET /api/orders/mine` — buyer's order history

### Collection & Escrow
- `POST /api/orders/{id}/confirm-collection` — body: `{qr_token}` → flips order to `COLLECTED`, releases escrow, logs reputation `+1` for both sides
- `POST /api/orders/{id}/dispute` — body: `{reason, evidence_photo}` → flips order to `DISPUTED`, logs reputation `-1` for farmer pending review

### Pricing (rule-based, framed as "MVP proxy for future ML")
- `GET /api/pricing/suggest?crop=<crop>&zone=<zone>` — returns `base_mandi_price * demand_multiplier`

### Reputation
- `GET /api/reputation/{actor_type}/{id}` — score + event log

**Notes on matching the pitch-deck stack:**
- Use **Pydantic** models for request/response validation (FastAPI's standard) alongside the SQLAlchemy models above.
- **Object Storage:** for the prototype, a local `/media` folder with FastAPI's `StaticFiles` mount is enough to demo "object storage" — swap for actual S3/MinIO only if there's spare time on Day 4.
- **Maps/Geolocation:** the haversine function above is all the "Maps/Geolocation" service needs for the demo — no external Maps API call required, so there's no API-key setup risk right before presenting.
- **SMS/Voice:** covered by the Twilio Studio flow in the Fake-It-Convincingly table below.

---

## 3. "Fake-It-Convincingly" Layer (Day 4)

| Feature | What to actually build | What to say in the demo |
|---|---|---|
| IVR | Twilio Studio flow (no-code, ~1-2 hrs): "Press 1 to list crop, press 2 for quantity..." → writes to same `CropListing` API via webhook | "This is the same backend the app uses — a feature-phone farmer can list produce without ever touching a screen" |
| CSC-assisted listing | Reuse farmer listing form, just add a note field `registered_via_csc_operator` | "An operator fills this out on the farmer's behalf at a CSC center" |
| AI quality grading | Simple rule: check image brightness/color variance against a threshold, store as `ai_grade_estimate` | "This is a lightweight MVP proxy — production version would use a trained computer vision model on a labeled produce dataset" |
| Demand forecasting | Skip entirely or hardcode a static "trending crops" list | "Roadmap item — becomes viable once real transaction volume exists" |
| Payment gateway | Just flip `escrow_status` in DB | "Escrow logic is real; the actual bank/UPI integration is a standard plug-in for production" |

---

## 4. Day-by-Day Checklist

### Day 1 — Backend Core
- [ ] FastAPI project structure (`routers/`, `models.py`, `schemas.py`, `services/`)
- [ ] PostgreSQL setup + SQLAlchemy models: Farmer, Buyer, AggregationPoint, CropListing
- [ ] Pydantic request/response schemas
- [ ] Auth endpoints (register/login, JWT, role-based)
- [ ] Nearest-aggregation-point assignment logic (haversine, runs on listing creation)
- [ ] Listing create/read endpoints
- [ ] Rule-based price suggestion endpoint
- [ ] Seed script: 3-5 aggregation points across 2 zones, 10-15 farmers with coordinates, 4-5 crops, sample photos

### Day 2 — Buyer Side & Aggregation-Point Matching
- [ ] Aggregation-point listing endpoints (`/aggregation-points/`, `/aggregation-points/{id}/listings/`)
- [ ] Zone-filtered browse endpoint, grouped by aggregation point
- [ ] Multi-item order creation: resolve to one aggregation point where possible, else `UNAVAILABLE_IN_ZONE` / `SUBSTITUTED`
- [ ] Frontend: farmer listing form, buyer browse-by-point + cart screen
- [ ] Order summary screen showing the resolved collection point + per-item status

### Day 3 — Collection, Escrow, Trust
- [ ] QR/OTP token generation on order creation
- [ ] Confirm-collection endpoint (escrow release + reputation log)
- [ ] Dispute endpoint (photo upload + reputation log)
- [ ] Reputation display on farmer/buyer profile pages
- [ ] Frontend: QR scan/confirm screen, dispute form

### Day 4 — Polish & Demo Prep
- [ ] Twilio Studio IVR flow (basic 3-4 step)
- [ ] Placeholder AI grading function wired to listing photo upload
- [ ] Full seed data refresh, run through entire flow 5x
- [ ] 1-minute live-click demo script (see below)
- [ ] Slide/board with honest "MVP vs Roadmap" split (ties to AI/ML question)

---

## 5. Demo Script (say this while clicking through)

1. "Farmer lists tomatoes via the app — or here's the same listing coming in through our IVR simulation. Watch it get auto-assigned to their nearest aggregation point, here."
2. "Buyer in the plains zone browses that aggregation point and sees tomato and onion from different farmers already gathered there — one point, multiple farmers. Carrot is marked unavailable in this zone, sourced from hill-zone stockists instead of fabricated logistics."
3. "Buyer places a multi-item order — it resolves to this single aggregation point, so one trip covers everything. No company vehicle involved anywhere."
4. "At pickup, buyer scans this QR — watch the order status flip and escrow release instantly to each farmer."
5. "Reputation score updates here — this is what keeps trust building transaction after transaction."

---

## 6. Give This Whole Spec to Antigravity

You can paste this file directly as your build prompt. Suggested framing when handing it off:

> "Build a FastAPI backend (Python, SQLAlchemy, Pydantic) with a PostgreSQL database and a React frontend implementing the models, endpoints, and day-by-day scope described below. Prioritize a working end-to-end demo loop (listing → auto-assignment to nearest aggregation point → order → QR collection → escrow release → reputation update) over completeness. Simulate IVR, AI grading, Maps/Geolocation (via the built-in haversine function), and the payment gateway exactly as described in the 'Fake-It-Convincingly' table rather than building them fully."
