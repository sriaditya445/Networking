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
    async def increment_counters(job_id: str, inc_fields: dict, set_fields: dict = None):
        """
        Atomically increment numeric counters on an upload document.

        Args:
            job_id: Upload ObjectId string
            inc_fields: dict of fields to $inc
            set_fields: optional dict of fields to $set
        """
        update_doc = {}
        if inc_fields:
            update_doc["$inc"] = inc_fields
        if set_fields:
            update_doc.setdefault("$set", {}).update(set_fields)

        return await uploads_collection.update_one(
            {"_id": ObjectId(job_id)},
            update_doc
        )

    @staticmethod
    async def delete(job_id: str):
        return await uploads_collection.delete_one(
            {"_id": ObjectId(job_id)}
        )

    @staticmethod
    async def count(query: dict = None):
        return await uploads_collection.count_documents(query or {})