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
        device_type: str
    ):

        return await TemplateRepository.find_template(
            vendor=vendor,
            device_type=device_type
        )

    @staticmethod
    async def assign_template(
        device: dict
    ):

        template = await TemplateService.find_template(
            vendor=device["vendor"],
            device_type=device["device_type"]
        )

        if template:

            await DeviceService.update_device(
                str(device["_id"]),
                {
                    "template_status": "SELECTED",
                    "template_id": str(template["_id"]),
                    "template_name": template["template_name"]
                }
            )

            return template

        await DeviceService.update_device(
            str(device["_id"]),
            {
                "template_status": "FAILED",
                "error_message": (
                    f"No template found for "
                    f"{device['vendor']} "
                    f"{device['device_type']}"
                )
            }
        )

        return None
    @staticmethod
    async def create_template(
        template_doc: dict
    ):

        return await TemplateRepository.create(
            template_doc
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