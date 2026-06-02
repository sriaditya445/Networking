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
        # job_id: str,
        job_folder: str
    ):

        filename = upload.filename.lower()

        if filename.endswith(".zip"):
            return await IngestionService.process_zip(
                upload,
                job_folder
            )
        else:
            await IngestionService.process_file(
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

        filename = os.path.basename(upload.filename)

        file_path = os.path.join(
            job_folder,
            filename
        )

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)

        # with open(
        #     file_path,
        #     "r",
        #     encoding="utf-8",
        #     errors="ignore"
        # ) as f:
        #     content = f.read()

        return {
            "filename": filename,
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

                # with open(
                #     file_path,
                #     "r",
                #     encoding="utf-8",
                #     errors="ignore"
                # ) as f:
                #     content = f.read()

                results.append({
                    "filename": file,
                    "file_path": file_path,
                    # "content": content
                })

        return results


# for file in files:
            #     filename = os.path.basename(file.filename)
            #     file_path = os.path.join(job_folder, filename)

            #     # Save raw file to disk
            #     with open(file_path, "wb") as buffer:
            #         shutil.copyfileobj(file.file, buffer)
                
            #     # Read configuration content
            #     with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            #         raw_config = f.read()
                # await IngestionService.stage_device(
                #     # job_id,
                #     file,
                #     file_path,
                #     content
                # )


    # @staticmethod
    # async def stage_device(
    #     job_id,
    #     filename,
    #     file_path,
    #     content
    # ):

    #     await DeviceService.create_device({
    #         "upload_id": job_id,
    #         "device_name": os.path.splitext(filename)[0],
    #         "device_type": "Pending Analysis",
    #         "configuration": content,
    #         "status": "pending",
    #         "file_path": file_path,
    #         "error_message": None,
    #         "parsed_at": None,
    #         "parsed_data": None
    #     })