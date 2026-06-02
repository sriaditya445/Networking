from app.repositories.device_repository import DeviceRepository

class DeviceService:

    @staticmethod
    async def create_device(device_doc: dict):
        return await DeviceRepository.create(device_doc)

    @staticmethod
    async def get_devices( upload_id:str = None , status: str = None):
        query = {}
        if upload_id:
            query["upload_id"] = upload_id
        if status:
            query["status"] = status
        return await DeviceRepository.get_all(query)

    @staticmethod
    async def get_device(device_id: str):
        return await DeviceRepository.get_by_id(device_id)

    @staticmethod
    async def update_device(device_id: str, data: dict):
        return await DeviceRepository.update(device_id,data)

    @staticmethod
    async def delete_devices_by_upload_id(upload_id: str):
        return await DeviceRepository.delete_by_upload_id(upload_id)

    @staticmethod
    async def count_devices(query: dict = None):
        return await DeviceRepository.count(query or {})