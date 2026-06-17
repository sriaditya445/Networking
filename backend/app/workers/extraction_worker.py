import os
import zipfile

from datetime import datetime

from app.core.database import logger

from app.services.device_service import (
    DeviceService
)

from app.repositories.upload_repository import (
    UploadRepository
)


class ExtractionWorker:

    @staticmethod
    async def process_upload(
        upload
    ):

        upload_id = str(upload["_id"])

        folder_path = upload["folder_path"]

        await UploadRepository.update(
            upload_id,
            {
                "status": "EXTRACTING",
                "updated_at":
                    datetime.utcnow()
            }
        )

        device_count = 0

        for root, _, files in os.walk(
            folder_path
        ):

            for file in files:

                file_path = os.path.join(
                    root,
                    file
                )

                if file.lower().endswith(
                    ".zip"
                ):

                    extract_dir = os.path.join(
                        root,
                        "extracted"
                    )

                    os.makedirs(
                        extract_dir,
                        exist_ok=True
                    )

                    with zipfile.ZipFile(
                        file_path,
                        "r"
                    ) as zip_ref:

                        zip_ref.extractall(
                            extract_dir
                        )

        for root, _, files in os.walk(
            folder_path
        ):

            for file in files:

                if file.lower().endswith(
                    ".zip"
                ):
                    continue

                file_path = os.path.join(
                    root,
                    file
                )

                await DeviceService.create_device(
                    {
                        "upload_id":
                            upload_id,

                        "device_name":
                            os.path.splitext(
                                file
                            )[0],

                        "device_type":
                            "Pending Analysis",

                        "configuration":
                            None,

                        "processing_status":
                            "PENDING",
                        "audit_status":"PENDING",

                        "file_path":
                            file_path,

                        "relative_path":
                            os.path.relpath(
                                file_path,
                                folder_path
                            ),

                        "error_message":
                            None,

                        "parsed_at":
                            None,

                        "parsed_data":
                            None
                    }
                )

                device_count += 1

        await UploadRepository.update(
            upload_id,
            {
                "status": "ANALYZING_DEVICES",

                "files_count":
                    device_count,

                "updated_at":
                    datetime.utcnow()
            }
        )