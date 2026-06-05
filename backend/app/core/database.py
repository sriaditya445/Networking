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
client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

# Expose collections
uploads_collection = db["uploads"]
devices_collection = db["devices"]
comparisons_collection = db["comparisons"]

# Audit collections (new for compliance audit platform)
audit_findings_collection = db["audit_findings"]
audit_reports_collection = db["audit_reports"]
batch_jobs_collection = db["batch_jobs"]
golden_templates_collection = db["golden_templates"]


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
