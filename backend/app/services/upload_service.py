import os
import shutil
import tempfile
from datetime import datetime
from bson import ObjectId
from app.repositories.upload_repository import UploadRepository
from app.services.device_service import DeviceService
from app.services.ingestion_service import IngestionService
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
        # Initialize upload with PENDING status
        job_doc.setdefault("status", "PENDING")
        return await UploadRepository.create(job_doc)

    @staticmethod
    async def get_uploads():
        return await UploadRepository.get_all()

    @staticmethod
    async def get_upload(job_id: str):
        return await UploadRepository.get_by_id(job_id)

    @staticmethod
    async def get_upload_by_id(job_id: str):
        return await UploadRepository.get_by_id(job_id)

    @staticmethod
    async def update_upload(job_id: str, data: dict):
        return await UploadRepository.update(job_id, data)

    @staticmethod
    async def increment_batch_counters(job_id: str, success: int = 0, failed: int = 0):
        """Atomically increment batch counters and refresh total_devices."""
        try:
            total = await DeviceService.count_devices({"upload_id": job_id})

            inc = {}
            if success:
                inc["batch_success_count"] = success
            if failed:
                inc["batch_failed_count"] = failed

            await UploadRepository.increment_counters(
                job_id,
                inc_fields=inc,
                set_fields={"total_devices": total, "updated_at": datetime.utcnow()}
            )

            await UploadService.recalculate_upload_status(job_id)
        except Exception as e:
            logger.error(f"Failed to increment batch counters for {job_id}: {e}")

    @staticmethod
    async def increment_audit_counters(job_id: str, success: int = 0, failed: int = 0):
        try:
            inc = {}
            if success:
                inc["audit_success_count"] = success
            if failed:
                inc["audit_failed_count"] = failed

            await UploadRepository.increment_counters(
                job_id,
                inc_fields=inc,
                set_fields={"updated_at": datetime.utcnow()}
            )

            await UploadService.recalculate_upload_status(job_id)
        except Exception as e:
            logger.error(f"Failed to increment audit counters for {job_id}: {e}")

    @staticmethod
    async def recalculate_upload_status(job_id: str):
        """Compute upload status from device states using rules:
        - any device FAILED -> upload FAILED
        - any device PROCESSING -> upload PROCESSING
        - all devices SUCCESS -> upload SUCCESS
        - all devices PENDING -> upload PENDING
        """
        try:
            total = await DeviceService.count_devices({"upload_id": job_id})

            if total == 0:
                await UploadRepository.update(job_id, {"status": "PENDING", "updated_at": datetime.utcnow()})
                return

            failed = await DeviceService.count_devices({"upload_id": job_id, "$or": [{"batch_status": "FAILED"}, {"audit_status": "FAILED"}, {"processing_stage": "FAILED"}]})

            if failed > 0:
                await UploadRepository.update(job_id, {"status": "FAILED", "updated_at": datetime.utcnow()})
                return

            processing = await DeviceService.count_devices({"upload_id": job_id, "processing_stage": {"$in": ["PROCESSING_BATCH", "PROCESSING_AUDIT"]}})

            if processing > 0:
                await UploadRepository.update(job_id, {"status": "PROCESSING", "updated_at": datetime.utcnow()})
                return

            pending = await DeviceService.count_devices({"upload_id": job_id, "batch_status": "PENDING"})

            if pending == total:
                await UploadRepository.update(job_id, {"status": "PENDING", "updated_at": datetime.utcnow()})
                return

            await UploadRepository.update(job_id, {"status": "SUCCESS", "updated_at": datetime.utcnow()})

        except Exception as e:
            logger.error(f"Failed to recalculate upload status for {job_id}: {e}")

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

        first_path = files[0].filename

        if first_path.lower().endswith(".zip"):
            folder_name = os.path.splitext(os.path.basename(first_path))[0]

        elif "/" in first_path:
            folder_name = first_path.split("/")[0]

        else:
            folder_name = f"upload_{job_id[:8]}"

        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")

        try:
            await UploadRepository.create({
                "_id": ObjectId(job_id),
                "folder_name": folder_name,
                "status": "PENDING",
                "files_count": len(files),
                "folder_path": job_folder,
                "error_message": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Failed to create job metadata: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database write failed.")

        os.makedirs(job_folder, exist_ok=True)

        try:
            saved_files = []

            for upload in files:
                result = await IngestionService.process_upload(upload, job_folder)
                if isinstance(result, list):
                    saved_files.extend(result)
                else:
                    saved_files.append(result)

            await UploadRepository.update(job_id, {"files_count": len(saved_files), "updated_at": datetime.utcnow()})

        except Exception as e:
            logger.error(f"Failed to stage files for job {job_id}: {e}")
            if os.path.exists(job_folder):
                shutil.rmtree(job_folder)

            await UploadRepository.update(job_id, {"status": "FAILED", "error_message": f"Staging failed: {e}", "updated_at": datetime.utcnow()})

            await DeviceService.delete_devices_by_upload_id(job_id)

            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to stage uploaded files on backend.")

        return {
            "job_id": job_id,
            "job_folder": job_folder,
            "folder_name": folder_name,
            "status": "PENDING",
            "files_count": len(files),
            "message": "Upload successful. Raw data staged. Processing starts in background."
        }

    @staticmethod
    async def delete_job(job_id: str):
        try:
            job = await UploadRepository.get_by_id(job_id)
            if not job:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

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
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete job: {str(e)}")
import os
import shutil
from datetime import datetime
from bson import ObjectId
from app.repositories.upload_repository import UploadRepository
from app.services.device_service import DeviceService
from app.services.ingestion_service import IngestionService
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
        # Initialize upload with PENDING status
        job_doc.setdefault("status", "PENDING")
        return await UploadRepository.create(job_doc)

    @staticmethod
    async def get_uploads():
        return await UploadRepository.get_all()

    @staticmethod
    async def get_upload(job_id: str):
        return await UploadRepository.get_by_id(job_id)

    @staticmethod
    async def get_upload_by_id(job_id: str):
        return await UploadRepository.get_by_id(job_id)

    @staticmethod
    async def update_upload(
        job_id: str,
        data: dict
    ):
        return await UploadRepository.update(
            job_id,
            data
                await UploadRepository.create({
                    "_id": ObjectId(job_id),
                    "folder_name": folder_name,
                    "status": "PENDING",
                    "files_count": len(files),
                    "folder_path": job_folder,
                    "error_message": None,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
            if success:
                inc["batch_success_count"] = success
            if failed:
                inc["batch_failed_count"] = failed

            await UploadRepository.increment_counters(
                job_id,
                inc_fields=inc,
                set_fields={"total_devices": total, "updated_at": datetime.utcnow()}
            )

            # Recalculate upload status based on device states
            await UploadService.recalculate_upload_status(job_id)
        except Exception as e:
            logger.error(f"Failed to increment batch counters for {job_id}: {e}")

    @staticmethod
    async def increment_audit_counters(job_id: str, success: int = 0, failed: int = 0):
        try:
            inc = {}
            if success:
                inc["audit_success_count"] = success
            if failed:
                inc["audit_failed_count"] = failed

            await UploadRepository.increment_counters(
                job_id,
                inc_fields=inc,
                set_fields={"updated_at": datetime.utcnow()}
            )

            # Recalculate upload status after audit updates
            await UploadService.recalculate_upload_status(job_id)
        except Exception as e:
            logger.error(f"Failed to increment audit counters for {job_id}: {e}")

    @staticmethod
    async def recalculate_upload_status(job_id: str):
        """Compute upload status from device states using rules:
                    {"status": "FAILED", "error_message": f"Staging failed: {e}", "updated_at": datetime.utcnow()}
        - any device PROCESSING -> upload PROCESSING
        - all devices SUCCESS -> upload SUCCESS
        - all devices PENDING -> upload PENDING
        """
        try:
            total = await DeviceService.count_devices({"upload_id": job_id})

            if total == 0:
                # no devices staged yet, leave as PENDING
                await UploadRepository.update(job_id, {"status": "PENDING", "updated_at": datetime.utcnow()})
                return

            failed = await DeviceService.count_devices({"upload_id": job_id, "$or": [{"batch_status": "FAILED"}, {"audit_status": "FAILED"}, {"processing_stage": "FAILED"}]})
                "status": "PENDING",
            if failed > 0:
                await UploadRepository.update(job_id, {"status": "FAILED", "updated_at": datetime.utcnow()})
                return

            processing = await DeviceService.count_devices({"upload_id": job_id, "processing_stage": {"$in": ["PROCESSING_BATCH", "PROCESSING_AUDIT"]}})

            if processing > 0:
                await UploadRepository.update(job_id, {"status": "PROCESSING", "updated_at": datetime.utcnow()})
                return

            pending = await DeviceService.count_devices({"upload_id": job_id, "batch_status": "PENDING"})

            if pending == total:
                await UploadRepository.update(job_id, {"status": "PENDING", "updated_at": datetime.utcnow()})
                return

            # Default: all devices are processed (no failed/processing/pending)
            await UploadRepository.update(job_id, {"status": "SUCCESS", "updated_at": datetime.utcnow()})

        except Exception as e:
            logger.error(f"Failed to recalculate upload status for {job_id}: {e}")

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
                "status": "uploaded",
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
                {
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
            "status": "uploaded",
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




            # all_processed_files = []
            # for upload in files:
            #     processed_files = await IngestionService.process_upload(upload,job_folder)
            #     all_processed_files.extend(processed_files)



            # for processed_file in all_processed_files:
            #     filename = processed_file["filename"]
            #     file_path = processed_file["file_path"]
            #     # content = processed_file["content"]

            #     logger.info(f"Creating device record for {filename}")
            #     # Stage raw device in devices collection as 'pending'                
            #     await DeviceService.create_device({
            #         "upload_id": job_id,
            #         "device_name": os.path.splitext(filename)[0],
            #         "device_type": "Pending Analysis",
            #         "configuration": None,
            #         "status": "pending",
            #         "file_path": file_path,
            #         "relative_path": processed_file["relative_path"],
            #         "error_message": None,
            #         "parsed_at": None,
            #         "parsed_data": None
            #     })
            #     logger.info(f"Created device record for {filename}")
            # await UploadRepository.update(
            #     job_id,
            #     {
            #         "files_count": len(all_processed_files),
            #         "updated_at": datetime.utcnow()
            #     }
            # )


        # folder_name = "configs"

        # if len(files) == 1 and files[0].filename.lower().endswith(".zip"):
        #     folder_name = os.path.splitext(
        #         files[0].filename
        #     )[0]

        # else:
        #     folder_name = f"upload_{job_id[:8]}"
