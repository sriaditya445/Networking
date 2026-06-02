import os
import shutil
from datetime import datetime
from bson import ObjectId
from app.repositories.upload_repository import UploadRepository
from app.services.device_service import DeviceService
from fastapi import HTTPException, status
from app.core.database import logger

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
    async def upload_files(files, folder_name: str):
        job_id = str(ObjectId())
        job_folder = os.path.join(UPLOAD_DIR, job_id)

        try:
            await UploadRepository.create({
                "_id": ObjectId(job_id),
                "folder_name": folder_name,
                "status": "pending",
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
            for file in files:
                filename = os.path.basename(file.filename)
                file_path = os.path.join(job_folder, filename)

                # Save raw file to disk
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                # Read configuration content
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    raw_config = f.read()
                
                logger.info(f"Creating device record for {filename}")
                # Stage raw device in devices collection as 'pending'                
                await DeviceService.create_device({
                    "upload_id": job_id,
                    "device_name": os.path.splitext(filename)[0],
                    "device_type": "Pending Analysis",
                    "configuration": raw_config,
                    "status": "pending",
                    "file_path": file_path,
                    "error_message": None,
                    "parsed_at": None,
                    "parsed_data": None
                })
                logger.info(f"Created device record for {filename}")

        except Exception as e:
            logger.error(f"Failed to stage files for job {job_id}: {e}")
            if os.path.exists(job_folder):
                shutil.rmtree(job_folder)

            await UploadRepository.update(
                    job_id,
                    {"status": "failed", "error_message": f"Staging failed: {e}", "updated_at": datetime.utcnow()}
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
            "status": "pending",
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
