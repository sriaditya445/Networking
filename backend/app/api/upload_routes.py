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

from app.schemas.upload_schema import (
    UploadResponse
)

from app.schemas.audit_selection_schema import (
    AuditSelectionRequest
)
router = APIRouter()

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


@router.get(
    "/api/uploads/{upload_id}/groups"
)
async def get_upload_groups(
    upload_id: str
):

    upload = await UploadService.get_upload(
        upload_id
    )

    return {
        "upload_id": upload_id,
        "groups": upload.get(
            "device_groups",
            []
        )
    }