"""
Audit Worker

Asynchronous worker that:
1. Finds devices with status='parsed' (waiting for audit)
2. Loads device configuration JSON
3. Runs audit using AuditService
4. Updates device with audit results
5. Updates upload counters

This worker runs independently of the parser worker via scheduler job:
process_pending_audits()
"""

from datetime import datetime
from app.core.database import logger, devices_collection, uploads_collection
from app.repositories.upload_repository import UploadRepository
from app.repositories.device_repository import DeviceRepository
from app.services.audit_service import AuditService
from app.services.upload_service import UploadService
from bson import ObjectId


class AuditWorker:
    """
    Processes devices waiting for audit (status='parsed').
    """

    @staticmethod
    async def process_audit_job(upload_id: str):
        """
        Process all pending audits for an upload.

        Args:
            upload_id: Upload ID to process audits for
        """
        logger.info(f"Starting audit job for upload: {upload_id}")

        # Update upload to show processing
        await UploadRepository.update(upload_id, {
            "updated_at": datetime.utcnow()
        })

        try:
            # Find all devices for this upload with status='parsed'
            devices = await devices_collection.find({
                "upload_id": upload_id,
                "processing_status":"SUCCESS",
                "audit_status":"PENDING"
            }).to_list(1000)

            if not devices:
                logger.info(f"No pending audits found for upload {upload_id}")
                return

            logger.info(f"Found {len(devices)} devices to audit for upload {upload_id}")

            success_count = 0
            failed_count = 0

            for device in devices:
                device_id = device["_id"]
                device_name = device.get("device_name", "Unknown")

                try:
                    # Get configuration JSON from device
                    configuration_json = device.get("configuration_json", {})
                    device_type = device.get("device_type", "Switch")

                    if not configuration_json:
                        raise ValueError("Configuration JSON is empty or missing")

                    logger.info(f"Auditing device: {device_name} (ID: {device_id})")


                    await devices_collection.update_one(
                        {"_id":device_id},
                        {
                            "$set":{
                                "audit_status":"PROCESSING"
                            }
                        }
                    )
                    # Run audit
                    audit_result = await AuditService.audit_device(
                        str(device_id),
                        configuration_json,
                        device_type
                    )

                    # Determine audit status based on score
                    audit_status = "SUCCESS" if audit_result["score"] >= 50 else "FAILED"

                    # Update device with audit results
                    await devices_collection.update_one(
                        {"_id": device_id},
                        {
                            "$set": {
                                "audit_result": audit_result,
                                "audit_status": audit_status,
                                "audit_score": audit_result["score"],
                                "audit_summary": audit_result["summary"],
                                "findings": audit_result["findings"],
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    await UploadService.recalculate_upload_status(
                        upload_id
                    )

                    logger.info(
                        f"Device audit completed: {device_name} "
                        f"(score: {audit_result['score']}, status: {audit_status})"
                    )
                    success_count += 1

                except Exception as device_error:
                    logger.error(
                        f"Audit error for device {device_id} ({device_name}): {device_error}"
                    )
                    failed_count += 1

                    # Update device with error status
                    await devices_collection.update_one(
                        {"_id": device_id},
                        {
                            "$set": {
                                # "status": "failed",
                                "error_message": f"Audit failed: {str(device_error)}",
                                "audit_status": "FAILED",
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )

            # Update upload counters and status
            await UploadService.recalculate_upload_status(
                upload_id
            )
            await AuditWorker._update_upload_counters(
                upload_id,
                success_count,
                failed_count
            )

            logger.info(
                f"Audit job completed for {upload_id}: "
                f"Success={success_count}, Failed={failed_count}"
            )

        except Exception as error:
            logger.error(f"Critical audit job failure for {upload_id}: {error}")
            await UploadRepository.update(upload_id, {
                "error_message": f"Audit job failed: {str(error)}",
                "updated_at": datetime.utcnow()
            })

    @staticmethod
    async def _update_upload_counters(
        upload_id: str,
        audit_success_count: int,
        audit_failed_count: int
    ):
        """
        Update upload document with audit counters.

        Args:
            upload_id: Upload ID
            audit_success_count: Number of successfully audited devices
            audit_failed_count: Number of failed audit devices
        """
        try:
            # Get current counters
            upload = await UploadRepository.get_by_id(upload_id)

            if not upload:
                logger.error(f"Upload not found: {upload_id}")
                return

            # Increment counters
            current_success = upload.get("audit_success_count", 0)
            current_failed = upload.get("audit_failed_count", 0)

            new_success = current_success + audit_success_count
            new_failed = current_failed + audit_failed_count

            # Determine new upload status
            total_devices = upload.get("total_devices", 0)
            if total_devices == 0:
                # Count from devices
                total_devices = await devices_collection.count_documents({
                    "upload_id": upload_id
                })

            # All devices audited?
            all_audited = (new_success + new_failed) >= total_devices

            upload_status = upload.get("status", "PROCESSING")
            if all_audited and upload_status == "PROCESSING":
                upload_status = "SUCCESS" if new_failed == 0 else "SUCCESS"  # Mark complete

            # Update upload
            await UploadRepository.update(upload_id, {
                "audit_success_count": new_success,
                "audit_failed_count": new_failed,
                "total_devices": total_devices,
                "status": upload_status,
                "updated_at": datetime.utcnow()
            })

            logger.debug(
                f"Updated upload counters: {upload_id} "
                f"(success: {new_success}, failed: {new_failed})"
            )

        except Exception as e:
            logger.error(f"Error updating upload counters for {upload_id}: {e}")
