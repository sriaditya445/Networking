from bson import ObjectId
from app.core.database import uploads_collection

class UploadRepository:

    @staticmethod
    async def create(job_doc: dict):
        return await uploads_collection.insert_one(job_doc)

    @staticmethod
    async def get_all():
        return await uploads_collection.find().sort("created_at", -1).to_list(100)

    @staticmethod
    async def get_by_id(job_id: str):
        return await uploads_collection.find_one(
            {"_id": ObjectId(job_id)}
        )

    @staticmethod
    async def update(job_id: str, data: dict):
        return await uploads_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": data}
        )

    @staticmethod
    async def delete(job_id: str):
        return await uploads_collection.delete_one(
            {"_id": ObjectId(job_id)}
        )

    @staticmethod
    async def count(query: dict = None):
        return await uploads_collection.count_documents(query or {})