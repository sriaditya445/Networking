from bson import ObjectId
from app.core.database import comparisons_collection

class ComparisonRepository:

    @staticmethod
    async def create_or_update(device_id: str, data: dict):
        """
        Creates or updates a configuration comparison result for a device.
        """
        return await comparisons_collection.update_one(
            {"device_id": device_id},
            {"$set": data},
            upsert=True
        )

    @staticmethod
    async def get_by_device_id(device_id: str):
        """
        Retrieves a comparison result by its associated device ID.
        """
        comparison = await comparisons_collection.find_one(
            {"device_id": device_id}
        )
        if comparison:
            comparison["_id"] = str(comparison["_id"])
        return comparison

    @staticmethod
    async def get_all(query: dict = {}):
        """
        Retrieves all comparison results matching a query.
        """
        comparisons = await comparisons_collection.find(query).to_list(1000)
        for comp in comparisons:
            comp["_id"] = str(comp["_id"])
        return comparisons

    @staticmethod
    async def delete_by_device_id(device_id: str):
        """
        Deletes a comparison result by its associated device ID.
        """
        return await comparisons_collection.delete_one(
            {"device_id": device_id}
        )
