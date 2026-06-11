from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import audit, detect, templates
from app.config import settings
from app.database.mongodb import close_db, connect_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Network Audit & Compliance Platform",
    description="Enterprise network configuration audit, compliance validation, and golden template management",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audit.router)
app.include_router(templates.router)
app.include_router(detect.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "service": "network-audit-platform"}


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Network Audit & Compliance Platform API",
        "docs": "/docs",
        "health": "/health",
    }
