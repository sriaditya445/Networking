import os
import shutil
import tempfile

from fastapi import HTTPException
from fastapi.responses import (
    FileResponse,
    Response
)

from app.repositories.upload_repository import  UploadRepository
from app.services.device_service import DeviceService
from app.utils.file_utils import cleanup_temp_file

class FileService:

    @staticmethod
    async def download_device(device_id: str):
        """
        Downloads a single configuration file.
        """
        try:
            device = await DeviceService.get_device(device_id)
            if not device:
                raise HTTPException(status_code=404, detail="Device not found")
            
            file_path = device.get("file_path")
            if not file_path or not os.path.exists(file_path):

                # Fallback to direct text content download if the file is missing from local disk
                filename = f"{device.get('device_name', 'config')}.cfg"
                return Response(
                    content=device.get("configuration", ""),
                    media_type="application/octet-stream",
                    headers={"Content-Disposition": f"attachment; filename={filename}"}
                )
                
            return FileResponse(path=file_path, filename=os.path.basename(file_path), media_type="application/octet-stream")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error downloading configuration file: {e}")
            raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download configuration file: {str(e)}"
        )

    @staticmethod
    async def download_job(job_id: str, background_tasks):
        try:
            job = await UploadRepository.get_by_id( job_id)

            if not job:
                raise HTTPException(status_code=404, detail="Upload job not found")

            folder_path = job.get("folder_path")

            if not folder_path or not os.path.exists(folder_path):
                raise HTTPException(status_code=404, detail="Configuration directory not found on server")

            # Create a temporary ZIP file path using tempfile
            temp_dir = tempfile.gettempdir()
            zip_base_name = os.path.join(temp_dir, f"{job['folder_name']}_{job_id}")

            # shutil.make_archive creates <zip_base_name>.zip
            zip_path = shutil.make_archive(zip_base_name, 'zip', folder_path)

            background_tasks.add_task(cleanup_temp_zip, zip_path)

            return FileResponse(
                path=zip_path,
                filename=f"{job['folder_name']}.zip",
                media_type="application/zip"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating zip archive: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create zip download: {str(e)}"
            )
