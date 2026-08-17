import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings, MEDIA_DIR
from app.database import init_db
from app.seed import seed_data

from app.routers import (
    auth,
    listings,
    aggregation_points,
    buyer,
    orders,
    pricing,
    reputation,
    ivr
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database & Seed initial demo data
    await init_db()
    try:
        await seed_data()
    except Exception as e:
        print(f"Seed note: {e}")
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for KuralAgri: Aggregated Agricultural Supply Chain Platform with Escrow & AI Quality Grading",
    lifespan=lifespan
)

# Enable CORS for Frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local object storage (/media)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

# Include Routers under /api
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(buyer.router, prefix=settings.API_V1_PREFIX)
app.include_router(aggregation_points.router, prefix=settings.API_V1_PREFIX)
app.include_router(listings.router, prefix=settings.API_V1_PREFIX)
app.include_router(orders.router, prefix=settings.API_V1_PREFIX)
app.include_router(pricing.router, prefix=settings.API_V1_PREFIX)
app.include_router(reputation.router, prefix=settings.API_V1_PREFIX)
app.include_router(ivr.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {
        "platform": "KuralAgri API",
        "status": "online",
        "docs": "/docs",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
