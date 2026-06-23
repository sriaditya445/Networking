# repositories/vendor_repository.py

from bson import ObjectId

from app.core.database import get_db


class VendorRepository:

    @staticmethod
    def collection():
        return get_db().vendors

    @staticmethod
    async def create(
        vendor_doc: dict
    ):
        return await VendorRepository.collection().insert_one(
            vendor_doc
        )

    @staticmethod
    async def get_all(
        query: dict = {}
    ):

        vendors = await (
            VendorRepository.collection()
            .find(query)
            .sort("created_at", -1)
            .to_list(100)
        )

        for vendor in vendors:
            vendor["_id"] = str(vendor["_id"])

        return vendors

    @staticmethod
    async def get_by_id(
        vendor_id: str
    ):

        vendor = await (
            VendorRepository.collection()
            .find_one(
                {
                    "_id": ObjectId(vendor_id)
                }
            )
        )

        if vendor:
            vendor["_id"] = str(
                vendor["_id"]
            )

        return vendor

    @staticmethod
    async def update(
        vendor_id: str,
        data: dict
    ):

        return await (
            VendorRepository.collection()
            .update_one(
                {
                    "_id": ObjectId(vendor_id)
                },
                {
                    "$set": data
                }
            )
        )

    @staticmethod
    async def delete(
        vendor_id: str
    ):

        return await (
            VendorRepository.collection()
            .delete_one(
                {
                    "_id": ObjectId(vendor_id)
                }
            )
        )

    @staticmethod
    async def count(
        query: dict = {}
    ):

        return await (
            VendorRepository.collection()
            .count_documents(query)
        )