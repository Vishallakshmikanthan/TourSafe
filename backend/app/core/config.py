from __future__ import annotations

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production-at-least-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/toursafe"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # SMS
    FAST2SMS_API_KEY: str = ""

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://toursafe.vercel.app",
    ]

    # Blockchain (Polygon)
    POLYGON_RPC_URL: str = "https://rpc-mumbai.maticvigil.com"
    POLYGON_PRIVATE_KEY: str = ""
    DID_CONTRACT_ADDRESS: str = ""

    # ONNX model path
    ANOMALY_MODEL_PATH: str = "models/anomaly_lstm.onnx"

    # IPFS
    IPFS_API_URL: str = "https://api.pinata.cloud"
    PINATA_API_KEY: str = ""
    PINATA_SECRET: str = ""

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
