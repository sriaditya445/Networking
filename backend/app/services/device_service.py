from app.repositories.device_repository import DeviceRepository
from bson import ObjectId
from fastapi import HTTPException

class DeviceService:

    @staticmethod
    async def create_device(device_doc: dict):
        return await DeviceRepository.create(device_doc)


    @staticmethod
    async def get_devices(**filters):

        device_id = filters.pop(
            "device_id",
            None
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
            device["display_status"] = (
                DeviceService.get_display_status(
                    device
                )
            )

            return device

        devices = await DeviceRepository.get_all(
            filters
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

        template_status = device.get(
            "template_status",
            "PENDING_TEMPLATE_SELECTION"
        )

        audit_status = device.get(
            "audit_status",
            "PENDING"
        )

        if processing_status == "FAILED":
            return "FAILED"

        if processing_status == "PROCESSING":
            return "PARSING"

        if processing_status != "SUCCESS":
            return "PENDING"

        if template_status == "PENDING_TEMPLATE_SELECTION":
            return "WAITING_TEMPLATE_SELECTION"

        if template_status == "SELECTED" and audit_status == "PENDING":
            return "READY_FOR_AUDIT"

        if audit_status == "PROCESSING":
            return "AUDITING"

        if audit_status == "FAILED":
            return "FAILED"

        if audit_status == "SUCCESS":
            return "SUCCESS"

        return "PENDING"
