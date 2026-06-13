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
from app.workers.template_selection_worker import (
    TemplateSelectionWorker
)

async def process_uploaded_jobs():
    uploads = await uploads_collection.find(
        {
            "status": "PENDING_EXTRACTION"
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
            "status": "PENDING_PROCESSING"
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
            "status": "PROCESSING"
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

async def process_pending_template_selection():

    uploads = await uploads_collection.find(
        {
            "status": "PROCESSING"
        }
    ).to_list(100)

    for upload in uploads:

        await TemplateSelectionWorker.process_template_selection(
            str(upload["_id"])
        )