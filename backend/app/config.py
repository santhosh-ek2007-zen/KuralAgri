import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_DIR = BASE_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "KuralAgri API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    SECRET_KEY: str = "kuralagri-secret-super-key-prototype-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for demo ease
    
    # Database URL: defaults to PostgreSQL, or uses SQLite if PostgreSQL fails/configured
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./kuralagri.db"
    )
    
    # Zones supported
    VALID_ZONES: list[str] = ["PLAINS_A", "HILLS_B"]
    
    # Base mandi prices (INR/kg) and default multipliers
    BASE_MANDI_PRICES: dict[str, float] = {
        "Tomato": 28.0,
        "Onion": 32.0,
        "Potato": 24.0,
        "Carrot": 45.0,
        "Chilli": 60.0,
        "Cabbage": 20.0,
        "Brinjal": 30.0,
        "Beans": 55.0,
        "Beetroot": 38.0,
        "Cauliflower": 35.0
    }
    
    # Zone price adjustments
    ZONE_PRICE_MULTIPLIERS: dict[str, dict[str, float]] = {
        "PLAINS_A": {
            "Tomato": 1.0,
            "Onion": 1.05,
            "Carrot": 1.25, # Sourced from hills / scarce in plains
            "Chilli": 0.95,
            "Potato": 1.02,
            "Cabbage": 1.10
        },
        "HILLS_B": {
            "Carrot": 0.85, # Surplus in hills
            "Potato": 0.90,
            "Cabbage": 0.90,
            "Tomato": 1.20, # Transported to hills
            "Onion": 1.15,
            "Chilli": 1.10
        }
    }

    class Config:
        case_sensitive = True

settings = Settings()
