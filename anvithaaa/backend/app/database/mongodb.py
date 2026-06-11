from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongodb_url)
    _db = _client[settings.mongodb_db]
    await _ensure_indexes()


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


async def _ensure_indexes() -> None:
    db = get_db()
    await db.golden_templates.create_index(
        [("vendor", 1), ("device_type", 1), ("template_name", 1)], unique=True
    )
    await db.device_configs.create_index("device_name")
    await db.audit_results.create_index("device_name")
    await db.audit_results.create_index("created_at")
    await db.audit_reports.create_index("device_name")
    await db.audit_reports.create_index("created_at")
    await db.compliance_trends.create_index("date")
