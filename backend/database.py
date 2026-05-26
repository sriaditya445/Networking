import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fetch MongoDB details from environment variables or use defaults
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "network_config_db")

logger.info(f"Connecting to MongoDB at: {MONGODB_URL}")

# Create asynchronous MongoDB client
client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Expose collections
uploads_collection = db["uploads"]
devices_collection = db["devices"]

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
