# workers/template_selection_worker.py

from datetime import datetime

from app.services.device_service import DeviceService
from app.services.template_service import TemplateService
from app.services.upload_service import UploadService

from app.core.database import logger


class TemplateSelectionWorker:

    @staticmethod
    async def process_template_selection(
        upload_id: str
    ):

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        success_count = 0
        failed_count = 0

        for device in devices:

            if (
                device.get("processing_status") != "SUCCESS"
                or
                device.get("template_status")
                != "PENDING_TEMPLATE_SELECTION"
            ):
                continue

            try:

                await TemplateService.assign_template(
                    device
                )

                success_count += 1

            except Exception as e:

                logger.error(str(e))

                failed_count += 1

        await UploadService.update_upload(
            upload_id,
            {
                "template_success_count": success_count,
                "template_failed_count": failed_count,
                "updated_at": datetime.utcnow()
            }
        )