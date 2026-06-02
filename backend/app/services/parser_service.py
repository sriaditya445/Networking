import os
from datetime import datetime

from app.core.database import (
    logger,
    devices_collection
)

from app.repositories.upload_repository import (
    UploadRepository
)

from app.parsers.regex_parser import (
    parse_config_and_segregate
)

async def process_upload_job(upload_id: str, folder_path: str):

    logger.info(f"Starting parser job: {upload_id}")

    await UploadRepository.update(upload_id, {
        "status": "processing",
        "updated_at": datetime.utcnow()
    })

    try:
        devices = await devices_collection.find({
            "upload_id": upload_id,
            "status": "pending"
        }).to_list(1000)

        if not devices:
            logger.warning(f"No pending devices found for {upload_id}")
            raise ValueError("No staged device records found.")

        success_count = 0
        failed_count = 0

        for device in devices:
            device_id = device["_id"]
            file_path = device["file_path"]

            logger.info(f"Processing device file: {file_path}")

            try:
                content = device.get("configuration", "")

                if ( not content and os.path.exists(file_path) ):
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                if not content:
                    raise ValueError("Configuration content is empty or missing.")

                device_name, device_type, parsed_data = (parse_config_and_segregate( content, os.path.basename(file_path)))

                await devices_collection.update_one(
                    {"_id": device_id},
                    {
                        "$set": {
                            "device_name": device_name,
                            "device_type": device_type,
                            "configuration": content,
                            "status": "success",
                            "parsed_at": datetime.utcnow(),
                            "parsed_data": parsed_data,
                            "error_message": None
                        }
                    }
                )

                success_count += 1

            except Exception as file_error:

                logger.error( f"Error parsing device {device_id}: {file_error}")
                failed_count += 1

                await devices_collection.update_one(
                    {"_id": device_id},
                    {
                        "$set": {
                            "status": "failed",
                            "error_message": str(file_error),
                            "parsed_at": datetime.utcnow()
                        }
                    }
                )

        # change the status state as success if all passed not atleast one
        final_status = ("success" if success_count > 0 else "failed")

        error_message = (
            None
            if success_count > 0
            else "All configuration files failed during analysis."
        )

        await UploadRepository.update(upload_id, {
            "status": final_status,
            "error_message": error_message,
            "updated_at": datetime.utcnow()
        })

        logger.info(
            f"""
            Parser completed for {upload_id}
            Success: {success_count}
            Failed: {failed_count}
            Final Status: {final_status}
            """
        )

    except Exception as error:

        logger.error(f"Critical parser failure for {upload_id}: {error}")

        await UploadRepository.update(upload_id, {
            "status": "failed",
            "error_message": str(error),
            "updated_at": datetime.utcnow()
        })