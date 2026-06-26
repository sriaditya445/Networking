from datetime import datetime

from app.core.database import logger
from app.services.audit_service import AuditService
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService
from app.services.audit_result_service import AuditResultService
from app.services.audit_report_service import AuditReportService

class AuditWorker:

    @staticmethod
    async def process_audit_upload(
        upload_id: str
    ):

        logger.info(f"Starting audit upload for upload: {upload_id}")

        await UploadService.update_upload(
            upload_id,
            {
                "updated_at": datetime.utcnow()
            }
        )

        try:
            upload = await UploadService.get_upload(upload_id)
            groups = upload.get("device_groups",[])
            
            devices = [
                d
                for d in await DeviceService.get_devices(
                    upload_id=upload_id,
                    processing_status="SUCCESS",
                    audit_status="PENDING"
                )
                if d.get("template_id")
            ]

            if not devices:
                logger.info(f"No pending audits found for upload {upload_id}")
                return

            success_count = 0
            failed_count = 0
            
            for device in devices:
                device_id = str(device["_id"])

                try:
                    device_group_id = device["group_id"]
                    group = next(
                        (
                            g
                            for g in groups
                            if g["group_id"] == device_group_id
                        ),
                        None
                    )

                    if not group:
                        raise ValueError(
                            "No audit configuration found"
                        )

                    await DeviceService.update_device(
                        device_id,
                        {
                            "audit_status": "PROCESSING",
                            "updated_at": datetime.utcnow()
                        }
                    )
                    audit_mode = group["audit_mode"]
                    available_sections = group["available_sections"]
                    selected_sections = group.get("selected_sections", [])

                    if audit_mode == "full":
                        sections_to_audit = available_sections
                    else:
                        sections_to_audit = selected_sections

                    audit_result = await AuditService.audit_device(
                        device=device,
                        audit_mode=audit_mode,
                        selected_sections=sections_to_audit
                    )

                    audit_result_id = await AuditResultService.create_result(
                        device=device,
                        audit_result=audit_result,
                        audit_mode=audit_mode,
                        selected_sections=sections_to_audit
                    )

                    audit_report_id = (
                        await AuditReportService.create_report(
                            device=device,
                            audit_result_id=audit_result_id
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

            await UploadService.recalculate_upload_status(
                upload_id
            )

            logger.info(
                f"Audit upload completed for {upload_id}. "
                f"Success={success_count}, "
                f"Failed={failed_count}"
            )

        except Exception as error:

            logger.error(
                f"Critical audit upload failure for "
                f"{upload_id}: {error}"
            )

            await UploadService.update_upload(
                upload_id,
                {
                    "error_message": f"Audit upload failed: {error}",
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