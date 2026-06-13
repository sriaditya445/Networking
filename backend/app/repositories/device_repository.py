from bson import ObjectId
from app.core.database import devices_collection

class DeviceRepository:

    @staticmethod
    async def create(device_doc: dict):
        return await devices_collection.insert_one(device_doc)

    @staticmethod
    async def get_all(query: dict = {}):

        devices = await devices_collection.find(query).sort(
            "parsed_at",
            -1
        ).to_list(200)

        for device in devices:
            device["_id"] = str(device["_id"])

        return devices

    @staticmethod
    async def get_by_id(device_id: str):

        device = await devices_collection.find_one(
            {"_id": ObjectId(device_id)}
        )

        if device:
            device["_id"] = str(device["_id"])

        return device
    
    @staticmethod
    async def update(device_id: str, data: dict):
        return await devices_collection.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": data}
        )

    @staticmethod
    async def delete_by_upload_id(upload_id: str):
        return await devices_collection.delete_many(
            {"upload_id": upload_id}
        )

    @staticmethod
    async def count(query: dict):
        return await devices_collection.count_documents(query)

    # @staticmethod
    # async def get_all(query: dict = {}):
    #     return await devices_collection.find(query).sort(
    #         "parsed_at", -1
    #     ).to_list(200)


    # @staticmethod
    # async def get_by_id(device_id: str):
    #     return await devices_collection.find_one(
    #         {"_id": ObjectId(device_id)}
    #     )
