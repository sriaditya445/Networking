import os
import shutil
from datetime import datetime
from bson import ObjectId
from app.repositories.upload_repository import UploadRepository
from app.services.device_service import DeviceService
from app.services.ingestion_service import IngestionService
from app.services.template_service import (TemplateService)
from app.services.user_service import UserService
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

        upload["created_by"] = (
            await UserService.get_username(
                upload.get("created_by")
            )
        )

        upload["updated_by"] = (
            await UserService.get_username(
                upload.get("updated_by")
            )
        )

        return upload

    @staticmethod
    async def get_uploads():

        uploads = await UploadRepository.get_all()
        if not uploads:
            raise HTTPException(
                status_code=404,
                detail="Upload not found"
            )

        user_ids = set()
        for upload in uploads:
            if upload.get("created_by"):
                user_ids.add(upload["created_by"])

            if upload.get("updated_by"):
                user_ids.add(upload["updated_by"])

        users_map = await UserService.get_users_map(
            list(user_ids)
        )
        
        for upload in uploads:
            upload["_id"] = str(upload["_id"])
            upload["created_by"] = users_map.get(
                upload.get("created_by")
            )

            upload["updated_by"] = users_map.get(
                upload.get("updated_by")
            )

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
        data: dict,
        user_id: str | None = None
    ):

        if not user_id:
            user_id = await UserService.get_system_user_id()

        data["updated_at"] = datetime.utcnow()
        data["updated_by"] = user_id

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
        system_user_id = await UserService.get_system_user_id()
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

                "device_groups": [],

                "folder_path": upload_folder,
                "error_message": None,

                "created_by": system_user_id,
                "updated_by": system_user_id,

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

            await UploadService.update_upload(
                upload_id,
                {   "status": "PENDING_EXTRACTION",
                    "files_count": len(saved_files)
                }
            )

        except Exception as e:
            logger.error(f"Failed to stage files for upload {upload_id}: {e}")
            if os.path.exists(upload_folder):
                shutil.rmtree(upload_folder)

            await UploadService.update_upload(
                    upload_id,
                    {
                        "status": "FAILED",
                        "error_message": f"Staging failed: {e}"
                     }
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
        # elif all(
        #     d.get("audit_status") in ["SUCCESS", "FAILED"]
        #     for d in devices
        # ):
        #     status = "AUDIT_COMPLETED"

        elif all(
            d.get("audit_status") == "SUCCESS"
            for d in devices
        ):
            status = "COMPLETED"

        else:
            return

        await UploadService.update_upload(
            upload_id,
            {
                "status": status
            }
        )

    @staticmethod
    async def save_audit_selection(
        upload_id: str,
        request
    ):

        upload = await UploadService.get_upload(
            upload_id
        )

        if upload["status"] != "WAITING_AUDIT_SELECTION":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Audit selection allowed only when "
                    "upload is waiting for audit selection"
                )
            )

        groups = upload.get("device_groups", [])

        if not groups:
            raise HTTPException(
                status_code=400,
                detail="No device groups found"
            )

        groups_map = {
            group["group_id"]: group
            for group in groups
        }

        selected_groups = {
            selection.group_id
            for selection in request.selections
        }

        detected_groups = {
            group["group_id"]
            for group in groups
            if group.get("template_id")
        }

        missing_group_ids = (
            detected_groups - selected_groups
        )

        if missing_group_ids:
            raise HTTPException(
                status_code=400,
                detail={
                    "message":
                        "Audit selection required for all groups",
                    "missing_groups": [
                        group
                        for group in groups
                        if group["group_id"] in missing_group_ids
                    ]
                }
            )

        for selection in request.selections:

            group = groups_map.get(
                selection.group_id
            )

            if not group:
                raise HTTPException(
                    status_code=404,
                    detail=f"Group not found: {selection.group_id}"
                )

            if selection.audit_mode.lower() == "selected_sections":

                available_sections = set(
                    group.get(
                        "available_sections",
                        []
                    )
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
                            "group_id":
                                selection.group_id,
                            "invalid_sections":
                                list(invalid_sections),
                            "available_sections":
                                list(available_sections)
                        }
                    )

            group["audit_mode"] = (
                selection.audit_mode
            )

            group["selected_sections"] = (
                selection.selected_sections
            )

            await DeviceService.update_devices(
                {
                    "upload_id": upload_id,
                    "group_id": group["group_id"]
                },
                {
                    "audit_selection_done": True,
                    "updated_at": datetime.utcnow()
                }
            )

        await UploadService.update_upload(
            upload_id,
            {
                "device_groups": groups,
                "status": "READY_FOR_AUDIT"
            }
        )

        return {
            "message":
                "Audit selection saved successfully",
            "status":
                "READY_FOR_AUDIT"
        }


    @staticmethod
    async def refresh_upload_template_status(
        upload_id: str
    ):

        upload = await UploadService.get_upload(
            upload_id
        )

        groups = upload.get(
            "device_groups",
            []
        )

        if not groups:
            return upload.get("status")

        if any(
            g["template_status"]
            == "TEMPLATE_REQUIRED"
            for g in groups
        ):
            status = "WAITING_TEMPLATE_CREATION"

        elif any(
            not g.get("audit_mode")
            for g in groups
        ):
            status = "WAITING_AUDIT_SELECTION"

        else:
            status = "READY_FOR_AUDIT"

        await UploadService.update_upload(
            upload_id,
            {
                "status": status
            }
        )

        return status

    
    @staticmethod
    async def rebuild_device_groups(
        upload_id: str
    ):
        upload = await UploadService.get_upload(
            upload_id
        )

        existing_groups = {
            g["group_id"]: g
            for g in upload.get(
                "device_groups",
                []
            )
        }
        devices = await DeviceService.get_devices(
            upload_id=upload_id,
            processing_status="SUCCESS"
        )

        groups = {}

        for device in devices:

            key = (
                device["vendor_id"],
                device["family"],
                device["model"],
                device["role"]
            )

            if key not in groups:

                template = await TemplateService.find_template(
                    vendor_id=device["vendor_id"],
                    family=device["family"],
                    model=device["model"],
                    role=device["role"]
                )
                group_id = device["group_id"]
                existing = existing_groups.get(
                    group_id,
                    {}
                )
                groups[key] = {
                    "group_id": group_id,
                    "vendor_id": device["vendor_id"],
                    "family": device["family"],
                    "model": device["model"],
                    "role": device["role"],
                    "device_type": device["device_type"],
                    "template_family":
                        template.get("template_family")
                        if template else None,
                    "device_count": 0,

                    "template_id":
                        template["id"]
                        if template else None,

                    "template_name":
                        template.get("template_name")
                        if template else None,

                    "template_status":
                        "SELECTED"
                        if template
                        else "TEMPLATE_REQUIRED",

                    "available_sections":
                        list(
                            template.get(
                                "sections",
                                {}
                            ).keys()
                        )
                        if template
                        else [],

                    "audit_mode":
                        existing.get(
                            "audit_mode"
                        ),

                    "selected_sections":
                        existing.get(
                            "selected_sections",
                            []
                        )
                }

            groups[key]["device_count"] += 1

        await UploadService.update_upload(
            upload_id,
            {
                "device_groups": list(groups.values())
            }
        )

        return list(groups.values())
