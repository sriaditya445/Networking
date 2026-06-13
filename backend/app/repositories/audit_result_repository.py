from bson import ObjectId

from app.core.database import audit_results_collection


class AuditResultRepository:

    @staticmethod
    async def create(data: dict):

        return await audit_results_collection.insert_one(
            data
        )

    @staticmethod
    async def get_by_id(result_id: str):

        result = await audit_results_collection.find_one(
            {
                "_id": ObjectId(result_id)
            }
        )

        if result:
            result["_id"] = str(result["_id"])

        return result

    @staticmethod
    async def get_by_device_id(device_id: str):

        results = await audit_results_collection.find(
            {
                "device_id": device_id
            }
        ).to_list(100)

        for result in results:
            result["_id"] = str(result["_id"])

        return results

    @staticmethod
    async def get_all():

        results = await audit_results_collection.find(
            {}
        ).sort(
            "created_at",
            -1
        ).to_list(500)

        for result in results:
            result["_id"] = str(result["_id"])

        return results

    @staticmethod
    async def delete(result_id: str):

        return await audit_results_collection.delete_one(
            {
                "_id": ObjectId(result_id)
            }
        )