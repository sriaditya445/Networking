# repositories/template_repository.py

# from app.core.database import golden_templates_collection
from bson import ObjectId
DEFAULT_TEMPLATE_MAP = {
    ("Cisco", "switch"): "Cisco3650Standard",
    ("Cisco", "router"): "CiscoRouterStandard",
    ("Cisco", "wlc"): "Cisco9800WLCStandard",
    ("Cisco", "nexus"): "CiscoNexusStandard",
    ("Cisco", "firewall"): "CiscoFirewallStandard",
}

from app.core.database import get_db


class TemplateRepository:

    @staticmethod
    def collection():
        return get_db().golden_templates

    @staticmethod
    async def find_template(
        vendor: str,
        device_type: str,
        template_name: str | None = None
    ):

        query = {
            "vendor": vendor,
            "device_type": device_type
        }

        if template_name:
            query["template_name"] = template_name

        else:
            default_name = DEFAULT_TEMPLATE_MAP.get(
                (vendor, device_type)
            )

            if default_name:
                query["template_name"] = default_name

        return await TemplateRepository.collection().find_one(query)

    @staticmethod
    async def get_all(
        vendor: str = None,
        device_type: str = None
    ):

        query = {}

        if vendor:
            query["vendor"] = vendor

        if device_type:
            query["device_type"] = device_type

        return await TemplateRepository.collection().find(
            query
        ).to_list(100)

    @staticmethod
    async def create(template_doc: dict):

        result = await TemplateRepository.collection().insert_one(
            template_doc
        )

        return str(result.inserted_id)

    @staticmethod
    async def get_by_id(template_id: str):

        template = await TemplateRepository.collection().find_one(
            {
                "_id": ObjectId(template_id)
            }
        )

        if template:
            template["_id"] = str(template["_id"])

        return template

    @staticmethod
    async def update(
        template_id: str,
        data: dict
    ):

        result = await TemplateRepository.collection().update_one(
            {
                "_id": ObjectId(template_id)
            },
            {
                "$set": data
            }
        )

        return result.modified_count > 0

    @staticmethod
    async def delete(
        template_id: str
    ):

        result = await TemplateRepository.collection().delete_one(
            {
                "_id": ObjectId(template_id)
            }
        )

        return result.deleted_count > 0