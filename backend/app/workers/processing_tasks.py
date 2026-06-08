# processing_tasks.py

from app.core.database import logger
from app.workers.parser_worker import ParserWorker
from app.workers.audit_worker import AuditWorker
from app.workers.extraction_worker import (
    ExtractionWorker
)
from app.services.upload_service import UploadService

async def process_uploaded_jobs():
    all_uploads = await UploadService.get_uploads()
    uploads = [u for u in all_uploads if u.get("status") == "PENDING"]

    if not uploads:
        logger.info(
            "No uploaded jobs found."
        )
        return

    for upload in uploads:
        await ExtractionWorker.process_upload(
            upload
        )

async def process_pending_uploads():
    all_uploads = await UploadService.get_uploads()
    uploads = [u for u in all_uploads if u.get("status") == "PROCESSING"]

    if not uploads:
        logger.info(
            "No staged uploads found."
        )
        return

    for upload in uploads:
        await ParserWorker.process_upload_job(
            str(upload["_id"])
        )

async def process_pending_audits():
    """
    Process pending audits for uploads in 'parsed' status.
    
    Devices move from 'parsed' -> 'success/failed' after audit.
    """
    all_uploads = await UploadService.get_uploads()
    uploads = [u for u in all_uploads if u.get("status") == "PROCESSING"]

    if not uploads:
        logger.info(
            "No uploads pending audit."
        )
        return

    logger.info(f"Processing {len(uploads)} uploads for audit")

    for upload in uploads:
        await AuditWorker.process_pending_audits(
            str(upload["_id"])
        )
