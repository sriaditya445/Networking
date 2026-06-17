from bson import ObjectId
# from app.core.database import uploads_collection
from app.core.database import get_db

class UploadRepository:

    @staticmethod
    def collection():
        return get_db().uploads

    @staticmethod
    async def create(upload_doc: dict):
        return await UploadRepository.collection().insert_one(upload_doc)

    @staticmethod
    async def get_all():
        return await UploadRepository.collection().find().sort("created_at", -1).to_list(100)

    @staticmethod
    async def get_by_id(upload_id: str):
        return await UploadRepository.collection().find_one(
            {"_id": ObjectId(upload_id)}
        )
    
    @staticmethod
    async def get_by_status(status: str):
        return await UploadRepository.collection().find(
            {"status": status}
        ).to_list(100)

    @staticmethod
    async def update(upload_id: str, data: dict):
        return await UploadRepository.collection().update_one(
            {"_id": ObjectId(upload_id)},
            {"$set": data}
        )

    @staticmethod
    async def delete(upload_id: str):
        return await UploadRepository.collection().delete_one(
            {"_id": ObjectId(upload_id)}
        )

    @staticmethod
    async def count(query: dict = None):
        return await UploadRepository.collection().count_documents(query or {})