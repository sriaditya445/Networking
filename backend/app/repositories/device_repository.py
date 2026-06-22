from bson import ObjectId
# from app.core.database import devices_collection
from app.core.database import get_db

class DeviceRepository:
    @staticmethod
    def collection():
        return get_db().devices

    @staticmethod
    async def create(device_doc: dict):
        return await DeviceRepository.collection().insert_one(device_doc)

    @staticmethod
    async def get_all(query: dict = {}):

        devices = await DeviceRepository.collection().find(query).sort(
            "parsed_at",-1
        ).to_list(200)

        for device in devices:
            device["_id"] = str(device["_id"])

        return devices

    @staticmethod
    async def get_by_id(device_id: str):

        device = await DeviceRepository.collection().find_one(
            {"_id": ObjectId(device_id)}
        )

        if device:
            device["_id"] = str(device["_id"])

        return device
    
    @staticmethod
    async def update(device_id: str, data: dict):
        return await DeviceRepository.collection().update_one(
            {"_id": ObjectId(device_id)},
            {"$set": data}
        )

    @staticmethod
    async def update_many(
        query: dict,
        data: dict
    ):
        return await DeviceRepository.collection().update_many(
            query,
            {"$set": data}
        )
        
    @staticmethod
    async def delete_by_upload_id(upload_id: str):
        return await DeviceRepository.collection().delete_many(
            {"upload_id": upload_id}
        )

    @staticmethod
    async def count(query: dict):
        return await DeviceRepository.collection().count_documents(query)