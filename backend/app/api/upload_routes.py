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
    UploadJobResponse,AuditModeRequest
)

router = APIRouter()

@router.get("/api/jobs",response_model=List[UploadJobResponse])
async def get_jobs():
    return await UploadService.get_jobs()

@router.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    return await UploadService.delete_job(job_id)

@router.get("/api/jobs/{job_id}/download")
async def download_job_folder(job_id: str, background_tasks: BackgroundTasks):
    return await FileService.download_job(
        job_id,
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
