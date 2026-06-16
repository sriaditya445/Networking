from datetime import datetime

from app.core.database import logger
from app.services.audit_service import AuditService
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService
from app.services.audit_result_service import AuditResultService
from app.services.audit_report_service import AuditReportService

class AuditWorker:

    @staticmethod
    async def process_audit_job(
        upload_id: str
    ):

        logger.info(f"Starting audit job for upload: {upload_id}")

        await UploadService.update_upload(
            upload_id,
            {
                "updated_at": datetime.utcnow()
            }
        )

        try:
            upload = await UploadService.get_upload(upload_id)
            audit_selections = upload.get("audit_selections",[])
            
            devices = await DeviceService.get_devices(
                upload_id=upload_id,
                processing_status="SUCCESS",
                audit_status="PENDING",
                template_status="SELECTED"
            )

            if not devices:
                logger.info(f"No pending audits found for upload {upload_id}")
                return

            success_count = 0
            failed_count = 0
            
            for device in devices:
                device_id = str(device["_id"])

                try:
                    selection = next(
                        (
                            s
                            for s in audit_selections
                            if s["vendor"] == device.get("vendor")
                            and s["device_type"] == device.get("device_type")
                            and s.get("model") == device.get("model")
                        ),
                        None
                    )
                    if not selection:
                        raise ValueError("No audit selection found")

                    await DeviceService.update_device(
                        device_id,
                        {
                            "audit_status": "PROCESSING",
                            "updated_at": datetime.utcnow()
                        }
                    )

                    audit_result = await AuditService.audit_device(
                        device,
                        audit_mode=selection.get("audit_mode","FULL"),
                        selected_sections=selection.get("selected_sections",[])
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

                    await DeviceService.update_device(
                        device_id,
                        {
                            "audit_status": "SUCCESS",
                            "audit_score": audit_result["score"],
                            "audit_result_id": audit_result_id,
                            "audit_report_id": audit_report_id,
                            "updated_at": datetime.utcnow()
                        }
                    )

                    success_count += 1

                except Exception as error:

                    failed_count += 1

                    logger.error(
                        f"Audit failed for "
                        f"{device.get('device_name')}: "
                        f"{error}"
                    )

                    await DeviceService.update_device(
                        device_id,
                        {
                            "audit_status": "FAILED",
                            "error_message": f"Audit failed: {error}",
                            "updated_at": datetime.utcnow()
                        }
                    )

            await AuditWorker._update_upload_counters(
                upload_id,
                success_count,
                failed_count
            )
            
            await UploadService.update_upload(
                upload_id,
                {
                    "status": "COMPLETED",
                    "updated_at": datetime.utcnow()
                }
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

            await UploadService.update_upload(
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
            total_devices = await DeviceService.count_devices(
                {
                    "upload_id": upload_id
                }
            )

            await UploadService.update_upload(
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
                f"Failed updating audit counters: {e}"
            )