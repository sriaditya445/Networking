import os
# from app.core.logger import logger
from app.core.database import logger

def cleanup_temp_file(file_path: str):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Cleaned up temporary zip file: {file_path}")

    except Exception as e:
        logger.error(f"Error cleaning up temporary file: {e}")