# repositories/device_catalog_repository.py

from bson import ObjectId
from app.core.database import get_db


class DeviceCatalogRepository:

    @staticmethod
    def collection():
        return get_db().device_catalogs

    @staticmethod
    async def find_match(
        vendor_id: str,
        model: str | None
    ):

        collection = DeviceCatalogRepository.collection()

        if model:

            catalog = await collection.find_one({

                "vendor_id":vendor_id,

                "model":model

            })

            if catalog:

                return catalog

        return await collection.find_one({

            "vendor_id":vendor_id,

            "model":None

        })

    @staticmethod
    async def get_by_id(
        catalog_id: str
    ):
        return await (
            DeviceCatalogRepository.collection()
            .find_one(
                {
                    "_id": ObjectId(catalog_id)
                }
            )
        )