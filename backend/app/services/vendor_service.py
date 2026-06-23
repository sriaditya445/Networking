# services/vendor_service.py

from bson import ObjectId

from fastapi import HTTPException

from app.repositories.vendor_repository import (
    VendorRepository
)
from datetime import datetime

class VendorService:

    @staticmethod
    def validate_vendor_id(
        vendor_id: str
    ):

        if not ObjectId.is_valid(
            vendor_id
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid vendor id"
            )

    @staticmethod
    async def create_vendor(
        vendor_doc: dict
    ):

        existing = await VendorRepository.get_all(
            {
                "vendor_name":
                vendor_doc["vendor_name"]
            }
        )

        if existing:

            raise HTTPException(
                status_code=409,
                detail="Vendor already exists"
            )

        result = await VendorRepository.create(
            vendor_doc
        )

        return str(
            result.inserted_id
        )

    @staticmethod
    async def get_vendor(
        vendor_id: str
    ):

        VendorService.validate_vendor_id(
            vendor_id
        )

        vendor = await (
            VendorRepository.get_by_id(
                vendor_id
            )
        )

        if not vendor:

            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        return vendor

    @staticmethod
    async def get_vendors(
        vendor_name: str = None,
        vendor_code: str = None,
        status: str = None
    ):

        filters = {
            k: v
            for k, v in {
                "vendor_name": vendor_name,
                "vendor_code": vendor_code,
                "status": status
            }.items()
            if v is not None
        }

        return await VendorRepository.get_all(
            filters
        )
    
    @staticmethod
    async def get_vendor_name(vendor_id: str):

        vendor = await VendorService.get_vendor(
            vendor_id
        )

        return {
            "_id": vendor["_id"],
            "vendor_name": vendor["vendor_name"]
        }

    @staticmethod
    async def update_vendor(
        vendor_id: str,
        data: dict
    ):

        VendorService.validate_vendor_id(
            vendor_id
        )

        result = await VendorRepository.update(
            vendor_id,
            data
        )

        if result.modified_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        return await VendorRepository.get_by_id(
            vendor_id
        )

    @staticmethod
    async def delete_vendor(
        vendor_id: str
    ):

        VendorService.validate_vendor_id(
            vendor_id
        )

        result = await VendorRepository.delete(
            vendor_id
        )

        if result.deleted_count == 0:

            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        return {
            "message":
            "Vendor deleted successfully",
            "id": vendor_id
        }

    @staticmethod
    async def create_default_vendors():

        default_vendors = [
            {
                "vendor_name": "Cisco",
                "vendor_code": "CISCO"
            },
            {
                "vendor_name": "Juniper",
                "vendor_code": "JUNIPER"
            },
            {
                "vendor_name": "Arista",
                "vendor_code": "ARISTA"
            },
            {
                "vendor_name": "Palo Alto",
                "vendor_code": "PALOALTO"
            },
            {
                "vendor_name": "Fortinet",
                "vendor_code": "FORTINET"
            }
        ]

        for vendor in default_vendors:

            existing = await VendorRepository.get_all(
                {
                    "vendor_name": vendor["vendor_name"]
                }
            )

            if existing:
                continue

            await VendorRepository.create(
                {
                    **vendor,
                    "contact_person": "System",
                    "email": "system@localhost",
                    "phone": "N/A",
                    "status": "ACTIVE",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            )
