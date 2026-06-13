from fastapi import APIRouter

from app.schemas.stats_schema import (
    StatsResponse
)

from app.services.stats_service import (
    StatsService
)

router = APIRouter()

@router.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    return await StatsService.get_stats()

# MongoDBService.get_dashboard_stats()