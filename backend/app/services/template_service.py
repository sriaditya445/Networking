# services/template_service.py

from bson import ObjectId
from fastapi import HTTPException

from app.services.device_service import DeviceService
from app.repositories.template_repository import (
    TemplateRepository
)
from datetime import datetime
from pymongo.errors import DuplicateKeyError
from app.services.template_parser import (
    parse_template_content
)
from app.services.vendor_service import VendorService

class TemplateService:

    @staticmethod
    def _normalize_template_fields(
        vendor: str,
        device_type: str,
        model: str | None = None
    ):
        return (
            vendor.strip(),
            device_type.lower().strip(),
            model.upper().strip() if model else None
        )

    @staticmethod
    def _validate_template_id(
        template_id: str
    ):
        if not ObjectId.is_valid(template_id):
            raise HTTPException(
                status_code=400,
                detail="Invalid template id"
            )
#need to correct this
    @staticmethod
    async def find_template(
        vendor_id: str,
        family: str | None,
        model: str | None,
        role: str | None
    ):
        vendor, device_type, model = (
            TemplateService._normalize_template_fields(
                vendor_id,
                family,
                model,
                role
            )
        )

        return await TemplateRepository.find_template(
            vendor=vendor,
            device_type=device_type,
            model=model
        )

    @staticmethod
    async def create_template(
        template_doc: dict
    ):
        vendor, device_type, model = (
            TemplateService._normalize_template_fields(
                template_doc["vendor"],
                template_doc["device_type"],
                template_doc.get("model")
            )
        )

        template_doc["vendor"] = vendor
        template_doc["device_type"] = device_type
        template_doc["model"] = model

        vendors = await VendorService.get_vendors(
            vendor_name=template_doc["vendor"]
        )

        if not vendors:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Vendor '{template_doc['vendor']}' "
                    "does not exist. Create vendor first."
                )
            )

        existing = await TemplateRepository.find_exact_template(
            vendor_id=template_doc["vendor_id"],
            family=template_doc.get("family"),
            model=template_doc.get("model"),
            role=template_doc.get("role")
        )

        if existing:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Template already exists."
                )
            )

        try:
            result =  await TemplateRepository.create(
                template_doc
            )
            template_id = str(result.inserted_id)
            await DeviceService.update_devices(
                {
                    "vendor": vendor,
                    "device_type": device_type,
                    "model": model,
                    "template_id": None
                },
                {
                    "template_id": template_id,
                    "template_status": "SELECTED",
                    "audit_selection_done": False,
                    "audit_status": "PENDING",
                    "updated_at": datetime.utcnow()
                }
            )

            query = {
                "vendor": vendor,
                "device_type": device_type,
                "model": model
            }

            devices = await DeviceService.get_devices(**query)

            upload_ids = {
                device["upload_id"]
                for device in devices
            }

            from app.services.upload_service import UploadService
            for upload_id in upload_ids:
                await UploadService.rebuild_device_groups(
                    upload_id
                )
                await UploadService.refresh_upload_template_status(
                    upload_id
                )
                
            return template_id

        except DuplicateKeyError:

            raise HTTPException(
                status_code=409,
                detail=(
                    f"Template already exists."
                )
            )

    @staticmethod
    async def get_template(
        template_id: str
    ):
        TemplateService._validate_template_id(
            template_id
        )

        template = await TemplateRepository.get_by_id(
            template_id
        )

        if not template:

            raise HTTPException(
                status_code=404,
                detail="Template not found"
            )

        return template

    @staticmethod
    async def update_template(
        template_id: str,
        data: dict
    ):

        TemplateService._validate_template_id(
            template_id
        )
        exists = await TemplateRepository.get_by_id(
            template_id
        )

        if not exists:
            raise HTTPException(
                status_code=404,
                detail="Template not found"
            )

        vendor, device_type, model = (
            TemplateService._normalize_template_fields(
                data["vendor"],
                data["device_type"],
                data.get("model")
            )
        )

        data["vendor"] = vendor
        data["device_type"] = device_type
        data["model"] = model

        parsed = parse_template_content(
            data["template_content"]
        )

        data["sections"] = parsed.sections
        data["updated_at"] = datetime.utcnow()

        await TemplateRepository.update(
            template_id,
            data
        )

        devices = await DeviceService.get_devices(
            template_id=template_id
        )

        await DeviceService.update_devices(
            {"template_id": template_id},
            {
                "audit_status": "PENDING",
                "audit_score": None,
                "audit_report_id": None,
                "audit_selection_done": False,
                "updated_at": datetime.utcnow()
            }
        )
        upload_ids = {
            device["upload_id"]
            for device in devices
        }

        for upload_id in upload_ids:
            await UploadService.rebuild_device_groups(
                upload_id
            )
            await UploadService.refresh_upload_template_status(
                upload_id
            )
        return await TemplateRepository.get_by_id(
            template_id
        )

    @staticmethod
    async def delete_template(
        template_id: str
    ):

        TemplateService._validate_template_id(
            template_id
        )

        deleted = await TemplateRepository.delete(
            template_id
        )

        if not deleted:

            raise HTTPException(
                status_code=404,
                detail="Template not found"
            )

        devices = await DeviceService.get_devices(
            template_id=template_id
        )
        await DeviceService.update_devices(
            {"template_id": template_id},
            {
                "template_status": "TEMPLATE_REQUIRED",
                "template_id": None,
                "audit_status": "PENDING",
                "audit_score": None,
                "audit_report_id": None,
                "audit_selection_done": False,
                "updated_at": datetime.utcnow()
            }
        )

        upload_ids = {
            device["upload_id"]
            for device in devices
        }
        for upload_id in upload_ids:
            await UploadService.rebuild_device_groups(
                upload_id
            )
            await UploadService.refresh_upload_template_status(
                upload_id
            )

        return {
            "message": "Template deleted successfully",
            "id": template_id
        }

    @staticmethod
    async def get_templates(**filters):

        filters = {
            k: v
            for k, v in filters.items()
            if v is not None
        }

        return await TemplateRepository.get_all(
            filters
        )
        