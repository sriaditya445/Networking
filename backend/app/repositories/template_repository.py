# repositories/template_repository.py

# from app.core.database import golden_templates_collection
from bson import ObjectId
from app.core.database import get_db

class TemplateRepository:

    @staticmethod
    def collection():
        return get_db().golden_templates

    @staticmethod
    async def find_template(
        vendor: str,
        device_type: str,
        model: str | None = None
    ):

        # Exact model match
        template = await TemplateRepository.collection().find_one(
            {
                "vendor": vendor,
                "device_type": device_type,
                "model": model
            }
        )

        # Fallback to generic template
        if not template and model is not None:

            template = await TemplateRepository.collection().find_one(
                {
                    "vendor": vendor,
                    "device_type": device_type,
                    "model": None
                }
            )

        if template:
            template["_id"] = str(template["_id"])

        return template

    @staticmethod
    async def get_all(query: dict = None):
        query = query or {}
        templates = await (
            TemplateRepository.collection()
            .find(query)
            .sort("created_at", -1)
            .to_list(100)
        )

        for template in templates:
            template["id"] = str(template.pop("_id"))
        return templates

    @staticmethod
    async def create(template_doc: dict):

        result = await TemplateRepository.collection().insert_one(
            template_doc
        )

        return result

    @staticmethod
    async def get_by_id(template_id: str):
        template = await TemplateRepository.collection().find_one(
            {"_id": ObjectId(template_id)}
        )

        if template:
            template["id"] = str(template.pop("_id"))

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