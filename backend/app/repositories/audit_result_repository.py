from bson import ObjectId
# from app.core.database import audit_results_collection
from app.core.database import get_db


class AuditResultRepository:
    @staticmethod
    def collection():
        return get_db().audit_results

    @staticmethod
    async def create(data: dict):

        return await AuditResultRepository.collection().insert_one(
            data
        )

    @staticmethod
    async def get_by_id(result_id: str):

        result = await AuditResultRepository.collection().find_one(
            {
                "_id": ObjectId(result_id)
            }
        )

        if result:
            result["_id"] = str(result["_id"])

        return result

    @staticmethod
    async def get_by_device_id(device_id: str):

        results = await AuditResultRepository.collection().find(
            {
                "device_id": device_id
            }
        ).to_list(100)

        for result in results:
            result["_id"] = str(result["_id"])

        return results

    @staticmethod
    async def get_all():

        results = await AuditResultRepository.collection().find(
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

        return await AuditResultRepository.collection().delete_one(
            {
                "_id": ObjectId(result_id)
            }
        )

    @staticmethod
    async def get_by_device_ids(device_ids: list[str]):

        results = await (
            AuditResultRepository.collection()
            .find(
                {
                    "device_id": {
                        "$in": device_ids
                    }
                }
            )
            .to_list(None)
        )

        for result in results:
            result["_id"] = str(result["_id"])

        return results