from app.repositories.device_repository import DeviceRepository
from bson import ObjectId
from fastapi import HTTPException

class DeviceService:

    @staticmethod
    async def create_device(device_doc: dict):
        return await DeviceRepository.create(device_doc)


    @staticmethod
    async def get_devices(
        device_id: str = None,
        upload_id: str = None,
        processing_status: str = None,
        audit_status: str = None
    ):

        if device_id and upload_id:
            raise HTTPException(
                status_code=400,
                detail="Provide either device_id or upload_id, not both"
            )

        if device_id:

            if not ObjectId.is_valid(device_id):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid device_id"
                )

            device = await DeviceRepository.get_by_id(
                device_id
            )

            if not device:
                raise HTTPException(
                    status_code=404,
                    detail="Device not found"
                )

            return device

        query = {}

        if upload_id:
            query["upload_id"] = upload_id

        if processing_status:
            query["processing_status"] = processing_status

        if audit_status:
            query["audit_status"] = audit_status

        devices = await DeviceRepository.get_all(
            query
        )

        for device in devices:

            device["display_status"] = (
                DeviceService.get_display_status(
                    device
                )
            )

        return devices

    @staticmethod
    async def update_device(device_id: str, data: dict):
        return await DeviceRepository.update(device_id,data)

    @staticmethod
    async def delete_devices_by_upload_id(upload_id: str):
        return await DeviceRepository.delete_by_upload_id(upload_id)

    @staticmethod
    async def count_devices(query: dict = None):
        return await DeviceRepository.count(query or {})
    
    @staticmethod
    def get_display_status(device: dict):

        processing_status = device.get(
            "processing_status",
            "PENDING"
        )

        audit_status = device.get(
            "audit_status",
            "PENDING"
        )

        if processing_status == "FAILED":
            return "FAILED"

        if processing_status == "PROCESSING":
            return "PROCESSING_CONFIGURATION"

        if processing_status == "SUCCESS" and audit_status == "PENDING":
            return "WAITING_FOR_AUDIT"

        if audit_status == "PROCESSING":
            return "AUDITING"

        if audit_status == "FAILED":
            return "FAILED"

        if audit_status == "SUCCESS":
            return "SUCCESS"

        return "PENDING"