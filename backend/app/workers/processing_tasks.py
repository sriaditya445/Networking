# batch_worker.py 

# from app.services.device_service import DeviceService 
from app.core.database import logger
from app.workers.parser_worker import ParserWorker
from app.workers.extraction_worker import (
    ExtractionWorker
)
from app.core.database import (
    uploads_collection
)

# async def process_pending_jobs():
#     devices = await DeviceService.get_devices(status = "pending")
#     for device in devices:
#         await DeviceService.update_device(str(device["_id"]),{"status": "processing"})

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
