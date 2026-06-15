from datetime import datetime

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

        await UploadService.update_upload(
            upload_id,
            {
                "updated_at": datetime.utcnow()
            }
        )

        try:

            # devices = await DeviceService.get_devices(
            #     {
            #         "upload_id": upload_id,
            #         "processing_status": "SUCCESS",
            #         "audit_status": "PENDING"
            #     }
            # )
            # devices = [
            #     d for d in devices
            #     if d.get("template_status") == "SELECTED"
            # ]

            devices = await DeviceService.get_devices(
                upload_id=upload_id,
                processing_status="SUCCESS",
                audit_status="PENDING",
                template_status="SELECTED"
            )

            if not devices:
                logger.info(f"No pending audits found for upload {upload_id}")
                return

            logger.info(f"Found {len(devices)} devices to audit")

            success_count = 0
            failed_count = 0

            upload = await UploadService.get_upload(
                upload_id
            )

            audit_mode = upload.get(
                "selected_audit_mode",
                "full"
            )
            
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
                        device,audit_mode=audit_mode
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

            upload = await UploadService.get_upload(
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
                f"Error updating audit counters: {e}"
            )