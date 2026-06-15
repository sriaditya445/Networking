from bson import ObjectId
# from app.core.database import uploads_collection
from app.core.database import get_db

class UploadRepository:

    @staticmethod
    def collection():
        return get_db().uploads

    @staticmethod
    async def create(job_doc: dict):
        return await UploadRepository.collection().insert_one(job_doc)

    @staticmethod
    async def get_all():
        return await UploadRepository.collection().find().sort("created_at", -1).to_list(100)

    @staticmethod
    async def get_by_id(job_id: str):
        return await UploadRepository.collection().find_one(
            {"_id": ObjectId(job_id)}
        )
    
    @staticmethod
    async def get_by_status(status: str):
        return await UploadRepository.collection().find(
            {"status": status}
        ).to_list(100)

    @staticmethod
    async def update(job_id: str, data: dict):
        return await UploadRepository.collection().update_one(
            {"_id": ObjectId(job_id)},
            {"$set": data}
        )

    @staticmethod
    async def delete(job_id: str):
        return await UploadRepository.collection().delete_one(
            {"_id": ObjectId(job_id)}
        )

    @staticmethod
    async def count(query: dict = None):
        return await UploadRepository.collection().count_documents(query or {})