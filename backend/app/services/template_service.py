# services/template_service.py

from app.services.device_service import DeviceService
from app.repositories.template_repository import (
    TemplateRepository
)
from datetime import datetime


class TemplateService:

    @staticmethod
    async def find_template(
        vendor: str,
        device_type: str,
        model: str | None = None
    ):

        return await TemplateRepository.find_template(
            vendor=vendor,
            device_type=device_type,
            model=model
        )
        
    @staticmethod
    async def create_template(
        template_doc: dict
    ):
        existing = await TemplateRepository.find_template(
            vendor=template_doc["vendor"],
            device_type=template_doc["device_type"],
            model=template_doc.get("model")
        )

        if existing:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Template already exists for "
                    f"{template_doc['vendor']} "
                    f"{template_doc['device_type']} "
                    f"{template_doc.get('model')}"
                )
            )

        try:
            return await TemplateRepository.create(
                template_doc
            )

        except DuplicateKeyError:

            raise HTTPException(
                status_code=409,
                detail=(
                    f"Template already exists for "
                    f"vendor={template_doc['vendor']}, "
                    f"device_type={template_doc['device_type']}, "
                    f"model={template_doc.get('model')}"
                )
            )

    @staticmethod
    async def get_template(
        template_id: str
    ):

        return await TemplateRepository.get_by_id(
            template_id
        )

    @staticmethod
    async def update_template(
        template_id: str,
        data: dict
    ):

        return await TemplateRepository.update(
            template_id,
            data
        )

    @staticmethod
    async def delete_template(
        template_id: str
    ):

        return await TemplateRepository.delete(
            template_id
        )

    @staticmethod
    async def get_templates(
        vendor: str = None,
        device_type: str = None,
        model: str | None = None
    ):

        return await TemplateRepository.get_all(
            vendor=vendor,
            device_type=device_type,
            model=model
        )