import os
import shutil
from datetime import datetime
from bson import ObjectId
from app.repositories.upload_repository import UploadRepository
from app.services.device_service import DeviceService
from app.services.ingestion_service import IngestionService
from app.services.template_service import (TemplateService)
from fastapi import HTTPException, status
from app.core.database import logger
from collections import defaultdict

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class UploadService:

    @staticmethod
    async def create_upload(job_doc: dict):
        return await UploadRepository.create(job_doc)

    @staticmethod
    async def get_uploads():
        return await UploadRepository.get_all()
    
    @staticmethod
    async def get_uploads_by_status(
        status: str
    ):
        return await UploadRepository.get_by_status(
            status
        )

    @staticmethod
    async def get_upload(job_id: str):
        return await UploadRepository.get_by_id(job_id)

    @staticmethod
    async def update_upload(
        job_id: str,
        data: dict
    ):
        return await UploadRepository.update(
            job_id,
            data
        )

    @staticmethod
    async def delete_upload(job_id: str):
        return await UploadRepository.delete(job_id)

    @staticmethod
    async def count_uploads(query: dict):
        return await UploadRepository.count(query)

    @staticmethod
    async def get_jobs():
        return await UploadRepository.get_all()

    @staticmethod
    async def upload_files(files,folder_name:str):
        job_id = str(ObjectId())
        job_folder = os.path.join(UPLOAD_DIR, job_id)

        first_path = files[0].filename

        if first_path.lower().endswith(".zip"):
            folder_name = os.path.splitext(
                os.path.basename(first_path)
            )[0]

        elif "/" in first_path:
            folder_name = first_path.split("/")[0]

        else:
            folder_name = f"upload_{job_id[:8]}"
   
        if not files:
            raise HTTPException(
                status_code=400,
                detail="No files uploaded"
            )

        try:
            await UploadRepository.create({
                "_id": ObjectId(job_id),
                "folder_name": folder_name,
                "status": "NEW",
                "files_count": len(files),
                "folder_path": job_folder,
                "error_message": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

        except Exception as e:
            logger.error(f"Failed to create job metadata: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database write failed."
            )
        
        # Save files locally and stage raw records in DB
        os.makedirs(job_folder, exist_ok=True)

        try:

            saved_files = []

            for upload in files:

                result = await IngestionService.process_upload(
                    upload,
                    job_folder
                )

                if isinstance(result, list):
                    saved_files.extend(result)
                else:
                    saved_files.append(result)

            await UploadRepository.update(
                job_id,
                {   "status": "PENDING_EXTRACTION",
                    "files_count": len(saved_files),
                    "updated_at": datetime.utcnow()
                }
            )

        except Exception as e:
            logger.error(f"Failed to stage files for job {job_id}: {e}")
            if os.path.exists(job_folder):
                shutil.rmtree(job_folder)

            await UploadRepository.update(
                    job_id,
                    {"status": "FAILED", "error_message": f"Staging failed: {e}", "updated_at": datetime.utcnow()}
                )

            await DeviceService.delete_devices_by_upload_id(job_id)
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to stage uploaded files on backend."
            )

        return {
            "job_id": job_id,
            "job_folder": job_folder,
            "folder_name": folder_name,
            "status": "NEW",
            "files_count": len(files),
            "message": "Upload successful. Raw data staged. Processing starts in background."
        }

    @staticmethod
    async def delete_job(job_id: str):
        """
        Deletes an upload job, local disk files, and staged/parsed devices from MongoDB.
        """
        try:

            job = await UploadRepository.get_by_id(job_id)

            if not job:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Job not found"
                )

            await UploadRepository.delete(job_id)

            await DeviceService.delete_devices_by_upload_id(job_id)

            folder_path = job.get("folder_path")

            if (folder_path and os.path.exists(folder_path)):
                shutil.rmtree(folder_path)

            return {"message": f"Job {job_id} and all staged data successfully deleted."}

        except HTTPException:
            raise

        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete job: {str(e)}"
            )

    @staticmethod
    async def recalculate_upload_status(upload_id:str):

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        if not devices:
            return

        if any(
            d.get("processing_status") in ["PENDING", "PROCESSING"]
            or d.get("audit_status") in ["PENDING", "PROCESSING"]
            for d in devices
        ):
            await UploadRepository.update(
                upload_id,
                {"status": "PROCESSING"}
            )
            return

        if any(
            d.get("processing_status") == "FAILED"
            or d.get("audit_status") == "FAILED"
            for d in devices
        ):
            await UploadRepository.update(
                upload_id,
                {"status": "FAILED"}
            )
        else:
            await UploadRepository.update(
                upload_id,
                {"status": "SUCCESS"}
            )

    @staticmethod
    async def get_template_options(
        upload_id: str
    ):

        upload = await UploadRepository.get_by_id(
            upload_id
        )

        if not upload:
            raise HTTPException(
                status_code=404,
                detail="Upload not found"
            )

        if upload.get("status") != "WAITING_TEMPLATE_SELECTION":
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Template selection is not available. "
                    f"Current upload status: "
                    f"{upload.get('status')}"
                )
            )

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        if not devices:
            return {
                "upload_id": upload_id,
                "status": upload.get("status"),
                "groups": []
            }

        grouped = defaultdict(int)

        for device in devices:

            key = (
                device.get("vendor","Unknown"),
                device.get("device_type","unknown"),
                device.get("model")
            )
            grouped[key] += 1

        groups = []

        for (
            vendor,
            device_type,
            model
        ), count in grouped.items():

            templates = await TemplateService.get_templates(
                vendor=vendor,
                device_type=device_type
            )

            groups.append(
                {
                    "vendor": vendor,
                    "device_type": device_type,
                    "model": model,
                    "device_count": count,
                    "templates": [
                        {
                            "template_id": str(
                                template["_id"]
                            ),
                            "template_name": template[
                                "template_name"
                            ],
                            "template_type": template.get(
                                "template_type",
                                "jinja2"
                            )
                        }
                        for template in templates
                    ]
                }
            )

        return {
            "upload_id": upload_id,
            "upload_status": upload.get(
                "status"
            ),
            "total_device_groups": len(
                groups
            ),
            "groups": groups
        }

    @staticmethod
    async def assign_templates(
        upload_id: str,
        request
    ):

        upload = await UploadRepository.get_by_id(
            upload_id
        )

        if not upload:

            raise HTTPException(
                status_code=404,
                detail="Upload not found"
            )

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        updated_devices = 0

        for assignment in request.assignments:

            template = await TemplateService.get_template(
                assignment.template_id
            )

            if not template:

                raise HTTPException(
                    status_code=404,
                    detail=f"Template not found: {assignment.template_id}"
                )

            for device in devices:

                if (
                    device.get("vendor")
                    == assignment.vendor
                    and
                    device.get("device_type")
                    == assignment.device_type
                ):

                    await DeviceService.update_device(
                        str(device["_id"]),
                        {
                            "template_id": assignment.template_id,
                            "template_name": template[
                                "template_name"
                            ],
                            "template_status": "SELECTED",
                            "updated_at": datetime.utcnow()
                        }
                    )

                    updated_devices += 1

        await UploadRepository.update(
            upload_id,
            {
                "status": "WAITING_AUDIT_SELECTION",
                "updated_at": datetime.utcnow()
            }
        )

        return {
            "message":
                "Templates assigned successfully",
            "updated_devices":
                updated_devices,
            "status":
                "WAITING_AUDIT_SELECTION"
        }

    @staticmethod
    async def get_audit_options(
        upload_id: str
    ):

        upload = await UploadRepository.get_by_id(
            upload_id
        )

        if not upload:
            raise HTTPException(
                status_code=404,
                detail="Upload not found"
            )

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        grouped = defaultdict(int)

        for device in devices:

            if device.get(
                "template_status"
            ) != "SELECTED":
                continue

            key = (
                device.get("vendor"),
                device.get("device_type"),
                device.get("model"),
                device.get("template_id"),
                device.get("template_name")
            )

            grouped[key] += 1

        response = []

        for (
            vendor,
            device_type,
            model,
            template_id,
            template_name
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
                    "template_name": template_name,
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

        upload = await UploadRepository.get_by_id(
            upload_id
        )

        if not upload:

            raise HTTPException(
                status_code=404,
                detail="Upload not found"
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
            "message": (
                "Audit selections saved successfully"
            ),
            "upload_id": upload_id,
            "status": "READY_FOR_AUDIT"
        }
        