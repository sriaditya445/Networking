from typing import List,Optional

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    BackgroundTasks,
    Form,
    HTTPException,
    status,
    Response
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


@router.get("/api/groups/{group_id}/report/pdf")
async def export_group_pdf(
    group_id: str,
    upload_id: str
):
    from app.repositories.audit_result_repository import AuditResultRepository
    from app.services.report_generator import ReportGenerator

    upload = await UploadService.get_upload(upload_id)
    
    group_info = None
    for g in upload.get("device_groups", []):
        if g["group_id"] == group_id:
            group_info = g
            break
            
    if not group_info:
        raise HTTPException(
            status_code=404,
            detail=f"Group {group_id} not found in upload {upload_id}"
        )
        
    devices = await DeviceService.get_devices(
        upload_id=upload_id,
        group_id=group_id,
        processing_status="SUCCESS"
    )
    
    if not devices:
        raise HTTPException(
            status_code=404,
            detail=f"No audited devices found in group {group_id}"
        )
        
    device_ids = [str(d["_id"]) for d in devices]
    audit_results = await AuditResultRepository.get_by_device_ids(device_ids)
    
    pdf_bytes = ReportGenerator.export_group_pdf(
        group_info,
        devices,
        audit_results
    )
    
    filename = f"{group_info.get('vendor')}_{group_info.get('model') or 'group'}_Report.pdf".replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/api/groups/{group_id}/report/excel")
async def export_group_excel(
    group_id: str,
    upload_id: str
):
    from app.repositories.audit_result_repository import AuditResultRepository
    from app.services.report_generator import ReportGenerator

    upload = await UploadService.get_upload(upload_id)
    
    group_info = None
    for g in upload.get("device_groups", []):
        if g["group_id"] == group_id:
            group_info = g
            break
            
    if not group_info:
        raise HTTPException(
            status_code=404,
            detail=f"Group {group_id} not found in upload {upload_id}"
        )
        
    devices = await DeviceService.get_devices(
        upload_id=upload_id,
        group_id=group_id,
        processing_status="SUCCESS"
    )
    
    if not devices:
        raise HTTPException(
            status_code=404,
            detail=f"No audited devices found in group {group_id}"
        )
        
    device_ids = [str(d["_id"]) for d in devices]
    audit_results = await AuditResultRepository.get_by_device_ids(device_ids)
    
    excel_bytes = ReportGenerator.export_group_excel(
        group_info,
        devices,
        audit_results
    )
    
    filename = f"{group_info.get('vendor')}_{group_info.get('model') or 'group'}_Report.xlsx".replace(" ", "_")
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/api/uploads/{upload_id}/report/pdf")
async def export_upload_pdf(
    upload_id: str
):
    from app.repositories.audit_result_repository import AuditResultRepository
    from app.services.report_generator import ReportGenerator

    upload = await UploadService.get_upload(upload_id)
    
    devices = await DeviceService.get_devices(
        upload_id=upload_id,
        processing_status="SUCCESS"
    )
    
    if not devices:
        raise HTTPException(
            status_code=404,
            detail="No audited devices found in this upload"
        )
        
    device_ids = [str(d["_id"]) for d in devices]
    audit_results = await AuditResultRepository.get_by_device_ids(device_ids)
    
    devices_by_group = {}
    audit_results_by_device = {r["device_id"]: r for r in audit_results if r}
    
    for d in devices:
        g_id = d.get("group_id")
        if g_id:
            if g_id not in devices_by_group:
                devices_by_group[g_id] = []
            devices_by_group[g_id].append(d)
            
    groups = [g for g in upload.get("device_groups", []) if g["group_id"] in devices_by_group]
    
    pdf_bytes = ReportGenerator.export_upload_pdf(
        upload,
        groups,
        devices_by_group,
        audit_results_by_device
    )
    
    filename = f"{upload.get('folder_name', 'upload')}_Audit_Report.pdf".replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/api/uploads/{upload_id}/report/excel")
async def export_upload_excel(
    upload_id: str
):
    from app.repositories.audit_result_repository import AuditResultRepository
    from app.services.report_generator import ReportGenerator

    upload = await UploadService.get_upload(upload_id)
    
    devices = await DeviceService.get_devices(
        upload_id=upload_id,
        processing_status="SUCCESS"
    )
    
    if not devices:
        raise HTTPException(
            status_code=404,
            detail="No audited devices found in this upload"
        )
        
    device_ids = [str(d["_id"]) for d in devices]
    audit_results = await AuditResultRepository.get_by_device_ids(device_ids)
    
    devices_by_group = {}
    audit_results_by_device = {r["device_id"]: r for r in audit_results if r}
    
    for d in devices:
        g_id = d.get("group_id")
        if g_id:
            if g_id not in devices_by_group:
                devices_by_group[g_id] = []
            devices_by_group[g_id].append(d)
            
    groups = [g for g in upload.get("device_groups", []) if g["group_id"] in devices_by_group]
    
    excel_bytes = ReportGenerator.export_upload_excel(
        upload,
        groups,
        devices_by_group,
        audit_results_by_device
    )
    
    filename = f"{upload.get('folder_name', 'upload')}_Audit_Report.xlsx".replace(" ", "_")
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


