from datetime import datetime

from app.core.database import (
    logger,
    devices_collection
)

from app.repositories.upload_repository import (
    UploadRepository
)

from app.services.audit_service import (
    AuditService
)

from app.services.device_service import (
    DeviceService
)

from app.services.upload_service import (
    UploadService
)

from app.services.audit_result_service import (
    AuditResultService
)

from app.services.audit_report_service import (
    AuditReportService
)


class AuditWorker:

    @staticmethod
    async def process_audit_job(
        upload_id: str
    ):

        logger.info(f"Starting audit job for upload: {upload_id}")

        await UploadRepository.update(
            upload_id,
            {
                "updated_at": datetime.utcnow()
            }
        )

        try:

            devices = await devices_collection.find(
                {
                    "upload_id": upload_id,
                    "processing_status": "SUCCESS",
                    "template_status": "SELECTED",
                    "audit_status": "PENDING"
                }
            ).to_list(1000)

            if not devices:
                logger.info(f"No pending audits found for upload {upload_id}")
                return

            logger.info(f"Found {len(devices)} devices to audit")

            success_count = 0
            failed_count = 0

            for device in devices:

                device_id = str(device["_id"])
                device_name = device.get("device_name", "Unknown")

                try:

                    logger.info(f"Auditing device: {device_name}")

                    await DeviceService.update_device(
                        device_id,
                        {
                            "audit_status": "PROCESSING",
                            "updated_at": datetime.utcnow()
                        }
                    )

                    audit_result = await AuditService.audit_device(
                        device
                    )

                    audit_result_id = (
                        await AuditResultService.create_result(
                            device=device,
                            audit_result=audit_result
                        )
                    )

                    audit_report_id = (
                        await AuditReportService.create_report(
                            device=device,
                            audit_result=audit_result
                        )
                    )

                    audit_status = (
                        "SUCCESS"
                        if audit_result["score"] >= 50
                        else "FAILED"
                    )

                    await DeviceService.update_device(
                        device_id,
                        {
                            "audit_status": audit_status,
                            "audit_score": audit_result["score"],
                            "audit_result_id": audit_result_id,
                            "audit_report_id": audit_report_id,
                            "updated_at": datetime.utcnow()
                        }
                    )

                    success_count += 1

                    logger.info(
                        f"Audit completed for "
                        f"{device_name} "
                        f"(score={audit_result['score']})"
                    )

                except Exception as device_error:

                    failed_count += 1

                    logger.error(
                        f"Audit failed for "
                        f"{device_name}: "
                        f"{device_error}"
                    )

                    await DeviceService.update_device(
                        device_id,
                        {
                            "audit_status": "FAILED",
                            "error_message": f"Audit failed: {device_error}",
                            "updated_at": datetime.utcnow()
                        }
                    )

            await AuditWorker._update_upload_counters(
                upload_id,
                success_count,
                failed_count
            )

            await UploadService.recalculate_upload_status(
                upload_id
            )

            logger.info(
                f"Audit job completed for {upload_id}. "
                f"Success={success_count}, "
                f"Failed={failed_count}"
            )

        except Exception as error:

            logger.error(
                f"Critical audit job failure for "
                f"{upload_id}: {error}"
            )

            await UploadRepository.update(
                upload_id,
                {
                    "error_message": f"Audit job failed: {error}",
                    "updated_at": datetime.utcnow()
                }
            )

    @staticmethod
    async def _update_upload_counters(
        upload_id: str,
        audit_success_count: int,
        audit_failed_count: int
    ):

        try:

            upload = await UploadRepository.get_by_id(
                upload_id
            )

            if not upload:
                logger.error(f"Upload not found: {upload_id}")
                return

            total_devices = upload.get(
                "total_devices",
                0
            )

            if total_devices == 0:

                total_devices = await devices_collection.count_documents(
                    {
                        "upload_id": upload_id
                    }
                )

            await UploadRepository.update(
                upload_id,
                {
                    "audit_success_count": audit_success_count,
                    "audit_failed_count": audit_failed_count,
                    "total_devices": total_devices,
                    "updated_at": datetime.utcnow()
                }
            )

        except Exception as e:

            logger.error(
                f"Error updating audit counters: {e}"
            )