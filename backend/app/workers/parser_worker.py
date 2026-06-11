import os
from datetime import datetime

from app.core.database import (
    logger,
    devices_collection
)

from app.repositories.upload_repository import (
    UploadRepository
)

from app.services.parser_service import (
    ParserService
)

class ParserWorker:

    async def process_upload_job(upload_id: str):

        logger.info(f"Starting parser job: {upload_id}")

        await UploadRepository.update(upload_id, {
            "status": "PROCESSING",
            "updated_at": datetime.utcnow()
        })

        try:
            devices = await devices_collection.find({
                "upload_id": upload_id,
                "processing_status": "PENDING"
            }).to_list(1000)

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

                    await devices_collection.update_one(
                        {"_id":device_id},
                        {
                            "$set":{
                                "processing_status":"PROCESSING"
                            }
                        }
                    )
                    result = (ParserService.parse_device( content, os.path.basename(file_path)))

                    await devices_collection.update_one(
                        {"_id": device_id},
                        {
                            "$set": {
                                "device_name": result.get("device_name", "Unknown"),
                                "device_type": result.get("device_type", "Unknown"),

                                "configuration": content,

                                "configuration_json":
                                    result.get("configuration_json", {}),

                                "processing_status": "SUCCESS",
                                "parsed_at": datetime.utcnow()
                            }
                        }
                    )

                    success_count += 1

                except Exception as file_error:

                    logger.error( f"Error parsing device {device_id}: {file_error}")
                    failed_count += 1

                    await devices_collection.update_one(
                        {"_id": device_id},
                        {
                            "$set": {
                                "processing_status": "FAILED",
                                "error_message": str(file_error),
                                "parsed_at": datetime.utcnow()
                            }
                        }
                    )

            # Update upload counters with parsing results
            await ParserWorker._update_upload_counters(
                upload_id,
                success_count,
                failed_count
            )



            logger.info(
                f"""
                Parser completed for {upload_id}
                Success: {success_count}
                Failed: {failed_count}
                """
            )

        except Exception as error:

            logger.error(f"Critical parser failure for {upload_id}: {error}")


    @staticmethod
    async def _update_upload_counters(
        upload_id: str,
        parsed_success: int,
        parsed_failed: int
    ):
        """
        Update upload document with parsing counters.
        
        Args:
            upload_id: Upload ID
            parsed_success: Number of successfully parsed devices
            parsed_failed: Number of failed to parse devices
        """
        try:
            upload = await UploadRepository.get_by_id(upload_id)
            
            if not upload:
                logger.error(f"Upload not found: {upload_id}")
                return
            
            # Get total device count
            total_devices = await devices_collection.count_documents({
                "upload_id": upload_id
            })
            
            # Increment counters
            current_success = upload.get("parsed_success_count", 0)
            current_failed = upload.get("parsed_failed_count", 0)
            
            new_success = current_success + parsed_success
            new_failed = current_failed + parsed_failed
            
            await UploadRepository.update(upload_id, {
                "total_devices": total_devices,
                "parsed_success_count": new_success,
                "parsed_failed_count": new_failed,
                "updated_at": datetime.utcnow()
            })
            
            logger.debug(
                f"Updated upload counters: {upload_id} "
                f"(parsed_success: {new_success}, parsed_failed: {new_failed})"
            )
            
        except Exception as e:
            logger.error(f"Error updating upload counters for {upload_id}: {e}")