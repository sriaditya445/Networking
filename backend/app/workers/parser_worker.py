import os
from datetime import datetime

from app.core.database import (
    logger
)

from app.services.upload_service import (
    UploadService
)

from app.services.device_service import (
    DeviceService
)

from app.services.parser_service import (
    ParserService
)
from app.services.template_service import (TemplateService)
class ParserWorker:

    async def process_upload_job(upload_id: str):

        logger.info(f"Starting parser upload: {upload_id}")

        try:
            devices = await DeviceService.get_devices(
                upload_id = upload_id,
                processing_status = "PENDING"
            )

            if not devices:

                logger.info(
                    f"No pending devices for upload {upload_id}"
                )

                await UploadService.refresh_upload_template_status(
                    upload_id
                )

                return

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

                    await DeviceService.update_device(
                        str(device_id),
                        {
                            "processing_status":"PROCESSING"
                        }
                    )
                    detection = detect_device(content)

                    catalog = await DeviceCatalogRepository.find_match(
                        detection["vendor_id"],
                        detection["model"]
                    )
                    result = {
                        # "device_name": hostname,

                        "vendor_id": catalog["vendor_id"],

                        "family": catalog["family"],

                        "model": catalog["model"],

                        "role": catalog["role"],

                        "device_type": catalog["device_type"],

                        "os": catalog["os"],
                        "version": catalog["version"],

                        # "configuration_json": config_json
                    }
                    parsed = (ParserService.parse_device( content, os.path.basename(file_path)))
                    # group_id = (
                    #     f"{result['vendor_id']}|"
                    #     f"{result['family']}|"
                    #     f"{result['model']}|"
                    #     f"{result['role']}"
                    # )

                    template = await TemplateService.find_template(
                        vendor_id=result["vendor_id"],
                        family=result["family"],
                        model=result["model"],
                        role=result["role"]
                    )

                    await DeviceService.update_device(
                        str(device_id),
                        {
                            **result,
                            "group_id": group_id,
                            "processing_status": "SUCCESS",
                            "parsed_at": datetime.utcnow(),
                            "template_status": "SELECTED" if template else "TEMPLATE_REQUIRED",
                            "template_id": template["id"] if template else None,
                            "audit_selection_done": False
                        }
                    )
                    
                    success_count += 1

                except Exception as file_error:

                    logger.error( f"Error parsing device {device_id}: {file_error}")
                    failed_count += 1

                    await DeviceService.update_device(
                        str(device_id),
                        {  
                            "processing_status": "FAILED",
                            "error_message": str(file_error),
                            "parsed_at": datetime.utcnow()                       
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
            upload = await UploadService.get_upload(upload_id)
            
            if not upload:
                logger.error(f"Upload not found: {upload_id}")
                return
            
            # Get total device count
            total_devices = await DeviceService.count_devices({
                "upload_id": upload_id
            })
            
            # Increment counters
            current_success = upload.get("parsed_success_count", 0)
            current_failed = upload.get("parsed_failed_count", 0)
            
            new_success = current_success + parsed_success
            new_failed = current_failed + parsed_failed

            await UploadService.update_upload(upload_id, {
                "total_devices": total_devices,
                "parsed_success_count": new_success,
                "parsed_failed_count": new_failed,
                "updated_at": datetime.utcnow()
            })

            # Check whether all devices have been processed
            if total_devices == (new_success + new_failed):
                await UploadService.rebuild_device_groups(
                    upload_id
                )

                await UploadService.refresh_upload_template_status(
                    upload_id
                )

                logger.info(
                    f"Parsing completed for upload {upload_id}"
                )
                
            logger.debug(
                f"Updated upload counters: {upload_id} "
                f"(parsed_success: {new_success}, parsed_failed: {new_failed})"
            )
            
        except Exception as e:
            logger.error(f"Error updating upload counters for {upload_id}: {e}")