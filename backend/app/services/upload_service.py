import os
import shutil
from datetime import datetime
from bson import ObjectId
from app.repositories.upload_repository import UploadRepository
from app.services.device_service import DeviceService
from app.services.ingestion_service import IngestionService
from app.services.template_service import (TemplateService)
from app.repositories.template_repository import TemplateRepository
from fastapi import HTTPException, status
from app.core.database import logger
from collections import defaultdict
from app.schemas.upload_schema import (
    UploadResponse
)

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class UploadService:

    @staticmethod
    async def get_upload(
        upload_id: str
    ):

        if not ObjectId.is_valid(upload_id):
            raise HTTPException(
                status_code=400,
                detail="Invalid upload id"
            )

        upload = await UploadRepository.get_by_id(
            upload_id
        )

        if not upload:
            raise HTTPException(
                status_code=404,
                detail="Upload not found"
            )

        upload["_id"] = str(upload["_id"])

        return upload

    @staticmethod
    async def get_uploads():

        uploads = await UploadRepository.get_all()

        for upload in uploads:
            upload["_id"] = str(upload["_id"])

        return uploads

    @staticmethod
    async def create_upload(upload_doc: dict):
        return await UploadRepository.create(upload_doc)
    
    @staticmethod
    async def get_uploads_by_status(
        status: str
    ):
        return await UploadRepository.get_by_status(
            status
        )

    @staticmethod
    async def update_upload(
        upload_id: str,
        data: dict
    ):
        await UploadService.get_upload(upload_id)

        return await UploadRepository.update(
            upload_id,
            data
        )

    @staticmethod
    async def count_uploads(query: dict):
        return await UploadRepository.count(query)

    @staticmethod
    async def upload_files(files,folder_name:str):
        upload_id = str(ObjectId())
        upload_folder = os.path.join(UPLOAD_DIR, upload_id)

        first_path = files[0].filename

        if first_path.lower().endswith(".zip"):
            folder_name = os.path.splitext(
                os.path.basename(first_path)
            )[0]

        elif "/" in first_path:
            folder_name = first_path.split("/")[0]

        else:
            folder_name = f"upload_{upload_id[:8]}"
   
        if not files:
            raise HTTPException(
                status_code=400,
                detail="No files uploaded"
            )

        try:
            await UploadRepository.create({
                "_id": ObjectId(upload_id),
                "folder_name": folder_name,
                "status": "NEW",

                "files_count": len(files),

                "total_devices": 0,

                "parsed_success_count": 0,
                "parsed_failed_count": 0,

                "audit_success_count": 0,
                "audit_failed_count": 0,

                "audit_selections": [],

                "folder_path": upload_folder,
                "error_message": None,

                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

        except Exception as e:
            logger.error(f"Failed to create upload metadata: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database write failed."
            )
        
        # Save files locally and stage raw records in DB
        os.makedirs(upload_folder, exist_ok=True)

        try:

            saved_files = []

            for upload in files:

                result = await IngestionService.process_upload(
                    upload,
                    upload_folder
                )

                if isinstance(result, list):
                    saved_files.extend(result)
                else:
                    saved_files.append(result)

            await UploadRepository.update(
                upload_id,
                {   "status": "PENDING_EXTRACTION",
                    "files_count": len(saved_files),
                    "updated_at": datetime.utcnow()
                }
            )

        except Exception as e:
            logger.error(f"Failed to stage files for upload {upload_id}: {e}")
            if os.path.exists(upload_folder):
                shutil.rmtree(upload_folder)

            await UploadRepository.update(
                    upload_id,
                    {"status": "FAILED", "error_message": f"Staging failed: {e}", "updated_at": datetime.utcnow()}
                )

            await DeviceService.delete_devices_by_upload_id(upload_id)
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to stage uploaded files on backend."
            )

        return {
            "upload_id": upload_id,
            "message": "Upload successful. Raw data staged. Processing starts in background."
        }

    @staticmethod
    async def delete_upload(upload_id: str):
        """
        Deletes an upload upload, local disk files, and staged/parsed devices from MongoDB.
        """
        try:

            upload = await UploadRepository.get_by_id(upload_id)

            if not upload:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="upload not found"
                )

            await UploadRepository.delete(upload_id)

            await DeviceService.delete_devices_by_upload_id(upload_id)

            folder_path = upload.get("folder_path")

            if (folder_path and os.path.exists(folder_path)):
                shutil.rmtree(folder_path)

            return {"message": f"upload {upload_id} and all staged data successfully deleted."}

        except HTTPException:
            raise

        except Exception as e:
            logger.error(f"Error deleting upload {upload_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete upload: {str(e)}"
            )

    @staticmethod
    async def recalculate_upload_status(
        upload_id: str
    ):

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        if not devices:
            return

        if any(
            d.get("audit_status") == "PROCESSING"
            for d in devices
        ):
            status = "AUDIT_IN_PROGRESS"

        elif any(
            d.get("audit_status") == "FAILED"
            for d in devices
        ):
            status = "FAILED"

        elif all(
            d.get("audit_status") == "SUCCESS"
            for d in devices
        ):
            status = "COMPLETED"

        else:
            return

        await UploadRepository.update(
            upload_id,
            {
                "status": status,
                "updated_at": datetime.utcnow()
            }
        )

    @staticmethod
    async def get_audit_options(
        upload_id: str
    ):

        await UploadService.get_upload(upload_id)

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        grouped = defaultdict(int)

        for device in devices:

            template = await TemplateService.find_template(
                vendor=device["vendor"],
                device_type=device["device_type"],
                model=device.get("model")
            )

            if not template:
                continue

            key = (
                device.get("vendor"),
                device.get("device_type"),
                device.get("model"),
                template["id"]
            )

            grouped[key] += 1

        response = []

        for (
            vendor,
            device_type,
            model,
            template_id,
        ), count in grouped.items():

            template = await TemplateService.get_template(
                template_id
            )

            sections = []

            if template:
                sections = list(
                    template.get(
                        "sections",
                        {}
                    ).keys()
                )

            response.append(
                {
                    "vendor": vendor,
                    "device_type": device_type,
                    "model": model,
                    "device_count": count,
                    "template_id": template_id,
                    "template_name": template.get("template_name"),
                    "available_sections": sections
                }
            )

        return {
            "upload_id": upload_id,
            "groups": response
        }

    @staticmethod
    async def save_audit_selection(
        upload_id: str,
        request
    ):

        upload = await UploadService.get_upload(upload_id)

        if upload["status"] != "WAITING_AUDIT_SELECTION":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Audit selection allowed only when "
                    "upload is waiting for audit selection"
                )
            )

        devices = await DeviceService.get_devices(
            upload_id=upload_id,
            processing_status="SUCCESS"
        )

        if not devices:
            raise HTTPException(
                status_code=400,
                detail="No analyzed devices found"
            )

        detected_groups = set()

        for device in devices:

            template = await TemplateService.find_template(
                vendor=device["vendor"],
                device_type=device["device_type"],
                model=device.get("model")
            )

            if not template:
                continue

            detected_groups.add(
                (
                    device.get("vendor"),
                    device.get("device_type"),
                    device.get("model"),
                    template["id"]
                )
            )

        selected_groups = set()

        for selection in request.selections:

            selected_groups.add(
                (
                    selection.vendor,
                    selection.device_type,
                    selection.model,
                    selection.template_id
                )
            )

            # ----------------------------
            # Validate template exists
            # ----------------------------

            template = await TemplateService.get_template(
                selection.template_id
            )

            if not template:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Template not found: "
                        f"{selection.template_id}"
                    )
                )

            # ----------------------------
            # Validate selected sections
            # ----------------------------

            if (
                selection.audit_mode.lower()
                == "selected_sections"
            ):

                available_sections = set(
                    template.get(
                        "sections",
                        {}
                    ).keys()
                )

                invalid_sections = (
                    set(selection.selected_sections)
                    - available_sections
                )

                if invalid_sections:

                    raise HTTPException(
                        status_code=400,
                        detail={
                            "message":
                            "Invalid sections selected",
                            "template_id":
                            selection.template_id,
                            "invalid_sections":
                            list(invalid_sections),
                            "available_sections":
                            list(available_sections)
                        }
                    )

        missing_groups = detected_groups - selected_groups

        if missing_groups:

            missing = [
                {
                    "vendor": vendor,
                    "device_type": device_type,
                    "model": model,
                    "template_id": template_id
                }
                for vendor, device_type, model,template_id in missing_groups
            ]

            raise HTTPException(
                status_code=400,
                detail={
                    "message": (
                        "Audit selection required "
                        "for all detected device groups"
                    ),
                    "missing_groups": missing
                }
            )

        await UploadRepository.update(
            upload_id,
            {
                "audit_selections": [
                    selection.model_dump()
                    for selection in request.selections
                ],
                "status": "READY_FOR_AUDIT",
                "updated_at": datetime.utcnow()
            }
        )

        return {
            "message": "Audit selection saved successfully",
            "status": "READY_FOR_AUDIT"
        }

    @staticmethod
    async def refresh_upload_template_status(
        upload_id: str
    ):

        upload = await UploadService.get_upload(upload_id)

        total_devices = await DeviceService.count_devices(
            {
                "upload_id": upload_id
            }
        )

        parsed_success = upload.get(
            "parsed_success_count",
            0
        )

        parsed_failed = upload.get(
            "parsed_failed_count",
            0
        )

        # Parsing still running
        if total_devices != (
            parsed_success + parsed_failed
        ):
            return upload.get("status")

        # Reconcile device template assignments
        devices = await DeviceService.get_devices(
            upload_id=upload_id,
            processing_status="SUCCESS"
        )

        for device in devices:

            template = await TemplateService.find_template(
                vendor=device["vendor"],
                device_type=device["device_type"],
                model=device.get("model")
            )

            if template:

                await DeviceService.update_device(
                    str(device["_id"]),
                    {
                        "template_status": "SELECTED",
                        "template_id": template["id"],
                        "updated_at": datetime.utcnow()
                    }
                )

        missing_groups = (
            await UploadService.get_missing_template_groups(
                upload_id
            )
        )

        status = (
            "WAITING_TEMPLATE_CREATION"
            if missing_groups
            else "WAITING_AUDIT_SELECTION"
        )

        await UploadRepository.update(
            upload_id,
            {
                "status": status,
                "updated_at": datetime.utcnow()
            }
        )

        return status

    @staticmethod
    async def get_missing_template_groups(
        upload_id: str
    ):
        devices = await DeviceService.get_devices(
            upload_id=upload_id,
            processing_status="SUCCESS"
        )

        grouped = {}

        for device in devices:

            template = await TemplateRepository.find_template(
                vendor=device["vendor"],
                device_type=device["device_type"],
                model=device.get("model")
            )

            # Template found (exact model or generic fallback)
            if template:
                continue

            key = (
                device["vendor"],
                device["device_type"],
                device.get("model")
            )

            grouped[key] = grouped.get(key, 0) + 1

        return [
            {
                "vendor": vendor,
                "device_type": device_type,
                "model": model,
                "device_count": count
            }
            for (
                vendor,
                device_type,
                model
            ), count in grouped.items()
        ]

    # @staticmethod
    # async def get_missing_template_groups(
    #     upload_id: str
    # ):
    #     devices = await DeviceService.get_devices(
    #         upload_id=upload_id,
    #         processing_status="SUCCESS"
    #     )

    #     # Reconcile deleted templates
    #     for device in devices:

    #         template_id = device.get("template_id")

    #         if not template_id:
    #             continue

    #         template = await TemplateRepository.get_by_id(
    #             template_id
    #         )

    #         if not template:

    #             await DeviceService.update_device(
    #                 str(device["_id"]),
    #                 {
    #                     "template_status": "TEMPLATE_REQUIRED",
    #                     "template_id": None
    #                 }
    #             )

    #             device["template_status"] = "TEMPLATE_REQUIRED"
    #             device["template_id"] = None

    #     grouped = {}

    #     for device in devices:

    #         if device.get("template_status") != "TEMPLATE_REQUIRED":
    #             continue

    #         key = (
    #             device.get("vendor"),
    #             device.get("device_type"),
    #             device.get("model")
    #         )

    #         grouped[key] = grouped.get(key, 0) + 1

    #     return [
    #         {
    #             "vendor": vendor,
    #             "device_type": device_type,
    #             "model": model,
    #             "device_count": count
    #         }
    #         for (
    #             vendor,
    #             device_type,
    #             model
    #         ), count in grouped.items()
    #     ]
        
# For missing template groups instead of status get missing templates searching every device
# devices = await DeviceService.get_devices(
#     upload_id=upload_id,
#     processing_status="SUCCESS"
# )

# grouped = {}

# for device in devices:

#     template = await TemplateService.find_template(
#         vendor=device["vendor"],
#         device_type=device["device_type"],
#         model=device.get("model")
#     )

#     if template:
#         continue

#     key = (
#         device["vendor"],
#         device["device_type"],
#         device.get("model")
#     )

#     grouped[key] = grouped.get(key, 0) + 1