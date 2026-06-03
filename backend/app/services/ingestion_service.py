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
        job_folder: str
    ):

        filename = upload.filename.lower()

        if filename.endswith(".zip"):
            return await IngestionService.process_zip(
                upload,
                job_folder
            )

        return [
            await IngestionService.process_file(
                upload,
                job_folder
            )
        ]

    @staticmethod
    async def process_file(
        upload: UploadFile,
        job_folder: str
    ):

        relative_path = upload.filename

        file_path = os.path.join(
            job_folder,
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
        job_folder: str
    ):
        results = []

        zip_path = os.path.join(
            job_folder,
            upload.filename
        )

        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)

        extract_dir = os.path.join(
            job_folder,
            "extracted"
        )

        os.makedirs(
            extract_dir,
            exist_ok=True
        )

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_dir)

        for root, _, files in os.walk(extract_dir):

            for file in files:

                file_path = os.path.join(
                    root,
                    file
                )

                results.append({
                    "filename": file,
                    "relative_path": os.path.relpath(
                        file_path,
                        extract_dir
                    ),
                    "file_path": file_path,
                })

        return results