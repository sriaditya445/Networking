from datetime import datetime

from app.core.database import logger
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService
from app.services.audit_service import AuditService


class AuditWorker:
    """Audit worker that uses the Service layer exclusively.

    - Finds devices ready for audit via `DeviceService.get_devices`
    - Updates device processing state via `DeviceService.update_device`
    - Runs `AuditService.simulate_audit` (deterministic) for now
    - Updates device with results via `DeviceService.update_after_audit`
    - Updates upload counters via `UploadService.increment_audit_counters`
    """

    @staticmethod
    async def process_pending_audits(upload_id: str):
        logger.info(f"Starting audit worker for upload: {upload_id}")

        try:
            devices = await DeviceService.get_devices(
                upload_id=upload_id,
                audit_status="PENDING",
                processing_stage="PENDING_AUDIT"
            )

            if not devices:
                logger.info(f"No devices pending audit for upload {upload_id}")
                return

            success_count = 0
            failed_count = 0

            for device in devices:
                device_id = device.get("_id")
                try:
                    # mark as processing
                    await DeviceService.update_device(device_id, {"audit_status": "PROCESSING", "processing_stage": "PROCESSING_AUDIT", "updated_at": datetime.utcnow()})

                    # use deterministic simulation for now
                    audit_result = AuditService.simulate_audit(device_id, device.get("configuration_json"), device.get("device_type"))

                    passed = (audit_result.get("score", 0) >= 50)

                    await DeviceService.update_after_audit(device_id, audit_result, success=passed)

                    if passed:
                        success_count += 1
                    else:
                        failed_count += 1

                except Exception as e:
                    logger.error(f"Audit error for device {device_id}: {e}")
                    failed_count += 1
                    await DeviceService.update_device(device_id, {"audit_status": "FAILED", "processing_stage": "FAILED", "error_message": str(e), "updated_at": datetime.utcnow()})

            # Update upload counters via service
            await UploadService.increment_audit_counters(upload_id, success_count, failed_count)

            logger.info(f"Audit worker completed for {upload_id}: success={success_count} failed={failed_count}")

        except Exception as e:
            logger.error(f"Critical audit worker failure for {upload_id}: {e}")
from app.core.database import logger
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService
from app.services.audit_service import AuditService


class AuditWorker:

    @staticmethod
    async def process_pending_audits(upload_id: str):
        """Process devices that are ready for audit using Service layer only."""
        logger.info(f"Starting audit worker for upload: {upload_id}")

        try:
            devices = await DeviceService.get_devices(upload_id=upload_id, audit_status="PENDING", processing_stage="PENDING_AUDIT")

            if not devices:
                logger.info(f"No devices pending audit for upload {upload_id}")
                return

            success_count = 0
            failed_count = 0

            for device in devices:
                device_id = device.get("_id")
                try:
                    # mark as processing
                    await DeviceService.update_device(device_id, {"audit_status": "PROCESSING", "processing_stage": "PROCESSING_AUDIT"})

                    audit_result = AuditService.simulate_audit(device_id, device.get("configuration_json"), device.get("device_type"))

                    passed = (audit_result.get("score", 0) >= 50)

                    await DeviceService.update_after_audit(device_id, audit_result, success=passed)

                    if passed:
                        success_count += 1
                    else:
                        failed_count += 1

                except Exception as e:
                    logger.error(f"Audit error for device {device_id}: {e}")
                    failed_count += 1
                    await DeviceService.update_device(device_id, {"audit_status": "FAILED", "processing_stage": "FAILED", "error_message": str(e)})

            await UploadService.increment_audit_counters(upload_id, success_count, failed_count)

            logger.info(f"Audit worker completed for {upload_id}: success={success_count} failed={failed_count}")

        except Exception as e:
            logger.error(f"Critical audit worker failure for {upload_id}: {e}")
from app.core.database import logger
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService
from app.services.audit_service import AuditService


class AuditWorker:

    @staticmethod
    async def process_pending_audits(upload_id: str):
        """Process devices that are ready for audit using Service layer only."""
        logger.info(f"Starting audit worker for upload: {upload_id}")

        try:
            devices = await DeviceService.get_devices(upload_id=upload_id, audit_status="PENDING", processing_stage="PENDING_AUDIT")

            if not devices:
                logger.info(f"No devices pending audit for upload {upload_id}")
                return

            success_count = 0
            failed_count = 0

            for device in devices:
                device_id = device.get("_id")
                try:
                    # mark as processing
                    await DeviceService.update_device(device_id, {"audit_status": "PROCESSING", "processing_stage": "PROCESSING_AUDIT"})

                    audit_result = AuditService.simulate_audit(device_id, device.get("configuration_json"), device.get("device_type"))

                    passed = (audit_result.get("score", 0) >= 50)

                    await DeviceService.update_after_audit(device_id, audit_result, success=passed)

                    if passed:
                        success_count += 1
                    else:
                        failed_count += 1

                except Exception as e:
                    logger.error(f"Audit error for device {device_id}: {e}")
                    failed_count += 1
                    await DeviceService.update_device(device_id, {"audit_status": "FAILED", "processing_stage": "FAILED", "error_message": str(e)})

            await UploadService.increment_audit_counters(upload_id, success_count, failed_count)

            logger.info(f"Audit worker completed for {upload_id}: success={success_count} failed={failed_count}")

        except Exception as e:
            logger.error(f"Critical audit worker failure for {upload_id}: {e}")
from datetime import datetime

from app.core.database import logger
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService
from app.services.audit_service import AuditService


class AuditWorker:

    @staticmethod
    async def process_pending_audits(upload_id: str):
        logger.info(f"Starting audit worker for upload: {upload_id}")

        try:
            # Find devices that have been parsed and awaiting audit
            devices = await DeviceService.get_devices(upload_id=upload_id, status="parsed", audit_status="PENDING")

            if not devices:
                logger.info(f"No devices pending audit for upload {upload_id}")
                return

            success_count = 0
            failed_count = 0

            for device in devices:
                device_id = device.get("_id")
                try:
                    # Mark as auditing
                    await DeviceService.update_device(device_id, {"audit_status": "RUNNING", "processing_stage": "AUDITING"})

                    # Use deterministic simulated audit for now
                    audit_result = AuditService.simulate_audit(device_id, device.get("configuration_json"), device.get("device_type"))

                    passed = (audit_result.get("score", 0) >= 50)

                    await DeviceService.update_after_audit(device_id, audit_result, success=passed)

                    if passed:
                        success_count += 1
                    else:
                        failed_count += 1

                except Exception as e:
                    logger.error(f"Audit error for device {device_id}: {e}")
                    failed_count += 1
                    await DeviceService.update_device(device_id, {"audit_status": "FAILED", "processing_stage": "FAILED", "error_message": str(e)})

            # Update upload audit counters
            await UploadService.increment_audit_counters(upload_id, success_count, failed_count)

            logger.info(f"Audit worker completed for {upload_id}: success={success_count} failed={failed_count}")

        except Exception as e:
            logger.error(f"Critical audit worker failure for {upload_id}: {e}")
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
                "status": "parsed"
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

                    # Run audit
                    audit_result = await AuditService.audit_device(
                        str(device_id),
                        configuration_json,
                        device_type
                    )

                    # Determine audit status based on score
                    audit_status = "SUCCESS" if audit_result["score"] >= 100 else "FAILED"

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
                                "status": "success",
                                "updated_at": datetime.utcnow()
                            }
                        }
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
                                "status": "failed",
                                "error_message": f"Audit failed: {str(device_error)}",
                                "audit_status": "FAILED",
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )

