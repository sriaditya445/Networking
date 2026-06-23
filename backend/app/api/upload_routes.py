from typing import List,Optional

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    BackgroundTasks,
    Form,
    HTTPException,
    status
)

from app.services.upload_service import (
    UploadService
)

from app.services.file_service import FileService
from app.services.device_service import DeviceService
from app.schemas.upload_schema import (
    UploadResponse
)
from app.schemas.audit_selection_schema import (
    AuditSelectionRequest
)

router = APIRouter()


# GET    /api/uploads
# GET    /api/uploads/{upload_id}
# GET    /api/uploads/{upload_id}/groups
# GET    /api/uploads/{upload_id}/files
# GET    /api/uploads/{upload_id}/download
# DELETE /api/uploads/{upload_id}
# POST   /api/upload
# POST   /api/uploads/{upload_id}/audit-selection

@router.get("/api/uploads",response_model=List[UploadResponse])
async def get_uploads():
    return await UploadService.get_uploads()

@router.get(
    "/api/uploads/{upload_id}",response_model=UploadResponse
)
async def get_upload(upload_id: str):
    return await UploadService.get_upload(
        upload_id
    )

# async def get_uploads(upload_id: Optional[str] = None):
#     return await UploadService.get_uploads(upload_id=upload_id)

@router.delete("/api/uploads/{upload_id}")
async def delete_upload(upload_id: str):
    return await UploadService.delete_upload(upload_id)

@router.get("/api/uploads/{upload_id}/download")
async def download_upload_folder(upload_id: str, background_tasks: BackgroundTasks):
    return await FileService.download_upload(
        upload_id,
        background_tasks
    )

@router.get(
    "/api/uploads/{upload_id}/files"
)
async def get_upload_files(
    upload_id: str
):
    devices = await DeviceService.get_devices(
        upload_id=upload_id
    )

    return {
        "upload_id": upload_id,
        "files": [
            {
                "device_id": str(device["_id"]),
                "device_name": device["device_name"],
                "relative_path": device.get(
                    "relative_path"
                )
            }
            for device in devices
        ]
    }

@router.post("/api/upload")
async def upload_files(
    folder_name: str = Form(...),
    files: list[UploadFile] = File(...)
):

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files were provided for upload."
        )

    response = await UploadService.upload_files(
        files,folder_name
    )
    
    return response


@router.post(
    "/api/uploads/{upload_id}/audit-selection"
)
async def save_audit_selection(
    upload_id: str,
    request: AuditSelectionRequest
):
    return await UploadService.save_audit_selection(
        upload_id,
        request
    )


@router.get("/api/uploads/{upload_id}/groups")
async def get_upload_groups(upload_id: str):

    upload = await UploadService.get_upload(upload_id)

    if upload["status"] in [
        "PENDING_EXTRACTION",
        "ANALYZING_DEVICES"
    ]:
        return {
            "upload_id": upload_id,
            "status": upload["status"],
            "message": (
                "Device extraction is still in progress. "
                "Groups will be available after analysis completes."
            )
        }

    if upload["status"] == "WAITING_TEMPLATE_CREATION":
        return {
            "upload_id": upload_id,
            "status": upload["status"],
            "message": "Templates are required for one or more groups.",
            "groups": upload.get("device_groups", [])
        }

    return {
        "upload_id": upload_id,
        "status": upload["status"],
        "groups": upload.get("device_groups", [])
    }

