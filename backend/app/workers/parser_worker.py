import os
from datetime import datetime

from app.core.database import logger

from app.services.parser_service import ParserService
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService

class ParserWorker:

    async def process_upload_job(upload_id: str):

        logger.info(f"Starting parser job: {upload_id}")

        await UploadService.update_upload(upload_id, {
            "status": "PROCESSING",
            "updated_at": datetime.utcnow()
        })

        try:
            devices = await DeviceService.find_pending_by_upload(upload_id)

            if not devices:
                logger.warning(f"No pending devices found for {upload_id}")
                raise ValueError("No staged device records found.")

            success_count = 0
            failed_count = 0

            for device in devices:
                device_id = device["_id"]
                file_path = device["file_path"]

                logger.info(f"Processing device file: {file_path}")

                try:
                    file_path = device.get("file_path")
                    content = None

                    if file_path and os.path.exists(file_path):
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()

                    if not content:
                        raise ValueError("Configuration content is empty or missing.")

                    result = ParserService.parse_device(content, os.path.basename(file_path))

                    parsed_payload = {
                        "device_name": result.get("device_name", "Unknown"),
                        "device_type": result.get("device_type", "Unknown"),
                        "configuration": content,
                        "parsed_data": result.get("parsed_data", {}),
                        "configuration_json": result.get("configuration_json", {}),
                        "parsed_at": datetime.utcnow()
                    }

                    await DeviceService.update_after_parse(device_id, parsed_payload)

                    success_count += 1

                except Exception as file_error:

                    logger.error( f"Error parsing device {device_id}: {file_error}")
                    failed_count += 1

                    await DeviceService.update_device(device_id, {
                        "status": "failed",
                        "error_message": str(file_error),
                        "processing_stage": "FAILED",
                        "parsed_at": datetime.utcnow()
                    })

            # Update upload counters with parsing results via UploadService
            await UploadService.increment_batch_counters(upload_id, success_count, failed_count)

            # Recalculate upload status from device states
            await UploadService.recalculate_upload_status(upload_id)

            logger.info(
                f"""
                Parser completed for {upload_id}
                Success: {success_count}
                Failed: {failed_count}
                Final Status: {final_status}
                """
            )

        except Exception as error:
            logger.error(f"Critical parser failure for {upload_id}: {error}")
            await UploadService.update_upload(upload_id, {
                "status": "FAILED",
                "error_message": str(error),
                "updated_at": datetime.utcnow()
            })
            