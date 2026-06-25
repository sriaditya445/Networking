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
    async def create_vendor(vendor_doc: dict):

        existing = await VendorRepository.get_all(
            {"vendor_name": vendor_doc["vendor_name"]}
        )

        if existing:
            raise HTTPException(
                status_code=409,
                detail="Vendor already exists"
            )

        result = await VendorRepository.create(vendor_doc)

        return {
            "message": "Vendor created successfully",
            "id": str(result.inserted_id)
        }

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

        VendorService.validate_vendor_id(vendor_id)

        result = await VendorRepository.update(
            vendor_id,
            data
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        return {
            "message": "Vendor updated successfully",
            "id": vendor_id
        }

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
                "vendor_code": "CISCO",
                "contact_person": "John Smith",
                "email": "john.smith@cisco.com",
                "phone": "+1-408-555-0100"

            },
            {
                "vendor_name": "Juniper",
                "vendor_code": "JUNIPER",
                "contact_person": "Sarah Jenkins",
                "email": "sjenkins@juniper.net",
                "phone": "+1-408-555-0200"
            },
            {
                "vendor_name": "Arista",
                "vendor_code": "ARISTA",
                "contact_person": "Michael Chang",
                "email": "mchang@arista.com",
                "phone": "+1-408-555-0200"
            },
            {
                "vendor_name": "Palo Alto",
                "vendor_code": "PALOALTO",
                "contact_person": "David Miller",
                "email": "dmiller@paloaltonetworks.com",
                "phone": "+1-408-555-0200"
            },
            {
                "vendor_name": "Fortinet",
                "vendor_code": "FORTINET",
                "contact_person": "Emma Watson",
                "email": "ewatson@fortinet.com",
                "phone": "+1-866-320-3224"
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
                    "status":"ACTIVE"
                }
            )
