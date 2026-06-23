from datetime import datetime

from fastapi import APIRouter

from app.schemas.common_schema import (
    VendorCreate,
    VendorResponse,
    VendorListResponse,
    VendorNameResponse,
    ActionResponse
)

from app.services.vendor_service import (
    VendorService
)

router = APIRouter(
    prefix="/api/vendors",
    tags=["Vendors"]
)


@router.get(
    "",
    response_model=list[VendorListResponse]
)
async def get_vendors(
    vendor_name: str = None,
    vendor_code: str = None,
    status: str = None
):

    return await VendorService.get_vendors(
        vendor_name=vendor_name,
        vendor_code=vendor_code,
        status=status
    )


@router.get(
    "/{vendor_id}",
    response_model=VendorResponse
)
async def get_vendor(
    vendor_id: str
):

    return await VendorService.get_vendor(
        vendor_id
    )


@router.get(
    "/{vendor_id}/name",
    response_model=VendorNameResponse
)
async def get_vendor_name(
    vendor_id: str
):

    return await VendorService.get_vendor_name(
        vendor_id
    )


@router.post(
    "",
    response_model=ActionResponse
)
async def create_vendor(
    vendor: VendorCreate
):

    return await VendorService.create_vendor(
        {
            **vendor.model_dump(),
            "status": "ACTIVE",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    )


@router.put(
    "/{vendor_id}",
    response_model=VendorResponse
)
async def update_vendor(
    vendor_id: str,
    vendor: VendorCreate
):

    return await VendorService.update_vendor(
        vendor_id,
        vendor.model_dump()
    )


@router.delete(
    "/{vendor_id}",
    response_model=ActionResponse
)
async def delete_vendor(
    vendor_id: str
):

    return await VendorService.delete_vendor(
        vendor_id
    )


# async def create_vendor(
#     vendor: VendorCreate
# ):

#     vendor_id = await (
#         VendorService.create_vendor(
#             {
#                 **vendor.model_dump(),
#                 "status": "ACTIVE",
#                 "created_at": datetime.utcnow(),
#                 "updated_at": datetime.utcnow()
#             }
#         )
#     )

#     return {
#         "message":
#         "Vendor created successfully",
#         "id": vendor_id
#     }