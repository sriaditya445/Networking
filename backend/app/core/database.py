import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

#Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

# Configure Logging
# logging.basicConfig(level=logging.INFO)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/application.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# MongoDB Connection
_client = None
_db = None

# Expose collections
uploads_collection = db["uploads"]
devices_collection = db["devices"]

# async def get_uploads_collection():
#     return get_db()["uploads"]

# async def get_devices_collection():
#     return get_db()["devices"]

async def check_db_connection():
    """
    Utility function to verify that MongoDB is online and reachable.
    """
    try:
        # Run a quick ping command
        await db.command("ping")
        logger.info("MongoDB connection verified successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        return False

    
async def connect_db() -> None:
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URL)
        _db = _client[settings.DATABASE_NAME]
        await _db.command("ping")
        # await _ensure_indexes()
        logger.info("MongoDB Connected")


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