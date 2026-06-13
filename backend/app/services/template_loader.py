# """Load golden templates from MongoDB or filesystem."""

# from motor.motor_asyncio import AsyncIOMotorDatabase

# from app.services.template_parser import ParsedTemplate, parse_template_content

# DEFAULT_TEMPLATE_MAP: dict[tuple[str, str], str] = {
#     ("Cisco", "switch"): "Cisco3650Standard",
#     ("Cisco", "router"): "CiscoRouterStandard",
#     ("Cisco", "wlc"): "Cisco9800WLCStandard",
#     ("Cisco", "nexus"): "CiscoNexusStandard",
#     ("Cisco", "firewall"): "CiscoFirewallStandard",
# }


# async def load_template_from_db(
#     db: AsyncIOMotorDatabase,
#     vendor: str,
#     device_type: str,
#     template_name: str | None = None,
# ) -> dict | None:
#     """Fetch golden template document from MongoDB."""
#     query: dict = {"vendor": vendor, "device_type": device_type}
#     if template_name:
#         query["template_name"] = template_name
#     else:
#         default_name = DEFAULT_TEMPLATE_MAP.get((vendor, device_type))
#         if default_name:
#             query["template_name"] = default_name

#     doc = await db.golden_templates.find_one(query)
#     if doc:
#         doc["id"] = str(doc.pop("_id"))
#     return doc


# # async def get_parsed_template(
# #     db: AsyncIOMotorDatabase,
# #     vendor: str,
# #     device_type: str,
# #     template_name: str | None = None,
# # ) -> tuple[dict | None, ParsedTemplate | None]:
# #     """Load and parse golden template."""
# #     doc = await load_template_from_db(db, vendor, device_type, template_name)
# #     if not doc:
# #         return None, None
# #     parsed = parse_template_content(doc["template_content"])
# #     return doc, parsed


# async def list_templates(
#     db: AsyncIOMotorDatabase,
#     vendor: str | None = None,
#     device_type: str | None = None,
# ) -> list[dict]:
#     """List all golden templates with optional filters."""
#     query: dict = {}
#     if vendor:
#         query["vendor"] = vendor
#     if device_type:
#         query["device_type"] = device_type

#     cursor = db.golden_templates.find(query).sort("template_name", 1)
#     results = []
#     async for doc in cursor:
#         doc["id"] = str(doc.pop("_id"))
#         results.append(doc)
#     return results
