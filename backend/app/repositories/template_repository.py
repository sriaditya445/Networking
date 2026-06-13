# repositories/template_repository.py

from app.core.database import golden_templates_collection

DEFAULT_TEMPLATE_MAP = {
    ("Cisco", "switch"): "Cisco3650Standard",
    ("Cisco", "router"): "CiscoRouterStandard",
    ("Cisco", "wlc"): "Cisco9800WLCStandard",
    ("Cisco", "nexus"): "CiscoNexusStandard",
    ("Cisco", "firewall"): "CiscoFirewallStandard",
}


class TemplateRepository:

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

        return await golden_templates_collection.find_one(query)

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

        return await golden_templates_collection.find(
            query
        ).to_list(100)