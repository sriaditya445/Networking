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
        status: str = None
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

        if status:
            query["status"] = status

        return await DeviceRepository.get_all(query)

    @staticmethod
    async def update_device(device_id: str, data: dict):
        return await DeviceRepository.update(device_id,data)

    @staticmethod
    async def delete_devices_by_upload_id(upload_id: str):
        return await DeviceRepository.delete_by_upload_id(upload_id)

    @staticmethod
    async def count_devices(query: dict = None):
        return await DeviceRepository.count(query or {})

            
    # @staticmethod
    # async def get_devices( upload_id:str = None , status: str = None):
    #     query = {}
    #     if upload_id:
    #         query["upload_id"] = upload_id
    #     if status:
    #         query["status"] = status
    #     return await DeviceRepository.get_all(query)