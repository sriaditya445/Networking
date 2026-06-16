# processing_tasks.py

from app.core.database import logger
from app.workers.parser_worker import ParserWorker
from app.workers.audit_worker import AuditWorker
from app.workers.extraction_worker import (
    ExtractionWorker
)
from app.services.upload_service import (UploadService)
from app.workers.template_selection_worker import (
    TemplateSelectionWorker
)

async def process_uploaded_jobs():
    uploads = await UploadService.get_uploads_by_status("PENDING_EXTRACTION")

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
    uploads = await UploadService.get_uploads_by_status("PENDING_PROCESSING")

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
    uploads = await UploadService.get_uploads_by_status("READY_FOR_AUDIT")
    if not uploads:
        logger.info(
            "No uploads pending audit."
        )
        return

    logger.info(f"Processing {len(uploads)} uploads for audit")

    for upload in uploads:
        await UploadService.update_upload(
            str(upload_id),
            {
                "status": "PROCESSING",
                "updated_at": datetime.utcnow()
            }
        )
        await AuditWorker.process_audit_job(
            str(upload["_id"])
        )