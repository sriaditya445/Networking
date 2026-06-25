# # services/device_catalog_service.py

# from app.repositories.device_catalog_repository import (
#     DeviceCatalogRepository
# )


# class DeviceCatalogService:
#     # delete this method
#     @staticmethod
#     async def enrich(
#         detection
#     ):

#         catalog = (
#             await DeviceCatalogRepository.find_match(
#                 detection.vendor_id,
#                 detection.model
#             )
#         )

#         if not catalog:
#             return detection

#         detection.family = catalog["family"]

#         detection.role = (
#             detection.role
#             or catalog.get("role")
#         )

#         detection.device_type = (
#             catalog["device_type"]
#         )

#         return detection