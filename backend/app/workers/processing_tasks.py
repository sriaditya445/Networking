# processing_tasks.py

from app.core.database import logger
from app.workers.parser_worker import ParserWorker
from app.workers.audit_worker import AuditWorker
from app.workers.extraction_worker import (
    ExtractionWorker
)
from app.core.database import (
    uploads_collection
)

async def process_uploaded_jobs():
    uploads = await uploads_collection.find(
        {
            "status": "uploaded"
        }
    ).to_list(100)

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
    uploads = await uploads_collection.find(
        {
            "status": "staged"
        }
    ).to_list(100)

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
    uploads = await uploads_collection.find(
        {
            "status": "parsed"
        }
    ).to_list(100)

    if not uploads:
        logger.info(
            "No uploads pending audit."
        )
        return

    logger.info(f"Processing {len(uploads)} uploads for audit")

    for upload in uploads:
        await AuditWorker.process_audit_job(
            str(upload["_id"])
        )
