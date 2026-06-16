from typing import List

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
    UploadJobResponse
)

from app.schemas.audit_selection_schema import (
    AuditSelectionRequest
)

router = APIRouter()

@router.get("/api/uploads",response_model=List[UploadJobResponse])
async def get_uploads():
    return await UploadService.get_uploads()

@router.delete("/api/uploads/{upload_id}")
async def delete_job(upload_id: str):
    return await UploadService.delete_job(upload_id)

@router.get("/api/uploads/{upload_id}/download")
async def download_job_folder(upload_id: str, background_tasks: BackgroundTasks):
    return await FileService.download_job(
        upload_id,
        background_tasks
    )

@router.post("/api/upload",status_code=status.HTTP_202_ACCEPTED)
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

# @router.get(
#     "/api/uploads/{upload_id}/template-options"
# )
# async def get_template_options(
#     upload_id: str
# ):
#     return await UploadService.get_template_options(
#         upload_id
#     )

# @router.post(
#     "/api/uploads/{upload_id}/templates"
# )
# async def assign_templates(
#     upload_id: str,
#     request: TemplateAssignmentRequest
# ):
#     return await UploadService.assign_templates(
#         upload_id,
#         request
#     )

@router.get(
    "/api/uploads/{upload_id}/audit-options"
)
async def get_audit_options(
    upload_id: str
):
    return await UploadService.get_audit_options(
        upload_id
    )

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