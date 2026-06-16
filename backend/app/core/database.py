import os
import logging

from motor.motor_asyncio import (
    AsyncIOMotorClient,
    AsyncIOMotorDatabase
)

from app.core.config import settings

os.makedirs("logs", exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/application.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

_client = None
_db : AsyncIOMotorDatabase | None = None


async def _ensure_indexes():
    db = get_db()

    await db.devices.create_index("upload_id")
    await db.devices.create_index("processing_status")
    await db.devices.create_index("audit_status")
    await db.devices.create_index("template_status")

    await db.audit_results.create_index("device_id")
    await db.audit_reports.create_index("device_id")

    await db.golden_templates.create_index(
        [
            ("vendor", 1),
            ("device_type", 1),
            ("template_name", 1)
        ],
        unique=True
    )

    logger.info("MongoDB indexes created")


async def connect_db():

    global _client, _db
    if _client is not None:
        return

    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    _db = _client[settings.DATABASE_NAME]

    await _db.command("ping")
    await _ensure_indexes()

    logger.info("MongoDB Connected")


async def close_db():

    global _client, _db

    if _client is not None:
        _client.close()

    _client = _db = None

    logger.info("MongoDB Connection Closed")


def get_db() -> AsyncIOMotorDatabase:

    if _db is None:
        raise RuntimeError("Database not initialized")

    return _db


async def check_db_connection():

    try:

        if _db is not None:
            db = _db

        else:
            client = AsyncIOMotorClient(settings.MONGODB_URL)
            db = client[settings.DATABASE_NAME]

        await db.command("ping")
        logger.info("MongoDB connection verified")
        return True

    except Exception as e:

        logger.error(f"MongoDB connection failed: {e}")
        return False