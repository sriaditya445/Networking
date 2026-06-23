import os
import shutil
import tempfile

from fastapi.responses import (
    FileResponse,
    Response
)

from app.repositories.upload_repository import  UploadRepository
from app.services.device_service import DeviceService
from app.utils.file_utils import cleanup_temp_file
from app.core.database import logger
from fastapi import (HTTPException, status)

class FileService:

# remove the device configuration
    @staticmethod
    async def download_device(device_id: str):
        """
        Downloads a single configuration file.
        """
        try:
            device = await DeviceService.get_device(device_id)
            if not device:
                raise HTTPException(status_code=404, detail="Device not found")
                
            file_path = device["file_path"]
            if not os.path.exists(file_path):
                raise HTTPException(
                    status_code=404,
                    detail="File not found"
                )

            return FileResponse(
                path=file_path,
                filename=os.path.basename(file_path),
                media_type="text/plain"
            )
                        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error downloading configuration file: {e}")
            raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download configuration file: {str(e)}"
        )

    @staticmethod
    async def download_upload(upload_id: str, background_tasks):
        try:
            upload = await UploadRepository.get_by_id( upload_id)

            if not upload:
                raise HTTPException(status_code=404, detail="Upload job not found")

            folder_path = upload.get("folder_path")

            if not folder_path or not os.path.exists(folder_path):
                raise HTTPException(status_code=404, detail="Configuration directory not found on server")

            # Create a temporary ZIP file path using tempfile
            temp_dir = tempfile.gettempdir()
            zip_base_name = os.path.join(temp_dir, f"{upload['folder_name']}_{upload_id}")

            # shutil.make_archive creates <zip_base_name>.zip
            zip_path = shutil.make_archive(zip_base_name, 'zip', folder_path)

            background_tasks.add_task(cleanup_temp_file, zip_path)

            return FileResponse(
                path=zip_path,
                filename=f"{upload['folder_name']}.zip",
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
