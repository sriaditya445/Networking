from fastapi import APIRouter
from datetime import datetime

from app.core.database import (
    check_db_connection
)

router = APIRouter()

@router.get("/api/health")
async def health_check():
    db_alive = await check_db_connection()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": "connected" if db_alive else "disconnected"
    }
