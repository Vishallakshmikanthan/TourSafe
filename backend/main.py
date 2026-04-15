from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — skip create_all since tables are managed by Supabase migrations.
    # Attempt a lightweight connection check; log warning on failure but don't crash.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: None)  # ping only
    except Exception as exc:
        import logging
        logging.getLogger("uvicorn.error").warning(
            "DB connection check failed at startup (will retry on first request): %s", exc
        )
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="TourSafe API",
    description="Smart Real-Time Tourist Safety & Emergency Response System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}
