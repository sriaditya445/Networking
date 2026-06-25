import os
import zipfile
import shutil

from fastapi import UploadFile

from app.services.device_service import DeviceService
from app.core.database import logger


class IngestionService:

    @staticmethod
    async def process_upload(
        upload: UploadFile,
        upload_folder: str
    ):

        filename = upload.filename.lower()

        if filename.endswith(".zip"):
            return await IngestionService.process_zip(
                upload,
                upload_folder
            )

        return [
            await IngestionService.process_file(
                upload,
                upload_folder
            )
        ]

    @staticmethod
    async def process_file(
        upload: UploadFile,
        upload_folder: str
    ):

        relative_path = upload.filename

        file_path = os.path.join(
            upload_folder,
            relative_path
        )

        os.makedirs(
            os.path.dirname(file_path),
            exist_ok=True
        )

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)

        return {
            "filename": os.path.basename(relative_path),
            "relative_path": relative_path,
            "file_path": file_path
        }


    @staticmethod
    async def process_zip(
        upload: UploadFile,
        upload_folder: str
    ):

        zip_path = os.path.join(
            upload_folder,
            upload.filename
        )

        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(
                upload.file,
                buffer
            )

        return {
            "filename": upload.filename,
            "file_path": zip_path,
            "is_zip": True
        }