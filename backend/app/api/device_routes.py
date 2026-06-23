import os
from typing import List, Optional

from fastapi import APIRouter

from app.schemas.device_schema import DeviceResponse

from app.services.device_service import (
    DeviceService
)

from fastapi.responses import FileResponse
from fastapi import HTTPException

from app.services.file_service import (
    FileService
)

router = APIRouter()

# GET /api/devices
# GET /api/devices/{device_id}

# GET /api/devices/{device_id}/configuration
# GET /api/devices/{device_id}/download

@router.get(
    "/api/devices",
    response_model=List[DeviceResponse]
)
async def get_devices(
    upload_id: Optional[str] = None,
    group_id: Optional[str] = None
):
    return await DeviceService.get_devices(
        upload_id=upload_id,
        group_id=group_id
    )

@router.get(
    "/api/devices/{device_id}",
    response_model=DeviceResponse
)
async def get_device(
    device_id: str
):
    return await DeviceService.get_device(
        device_id
    )

@router.put(
    "/api/devices/{device_id}",
    response_model=DeviceResponse
)
async def update_device(
    device_id: str,
    data: dict
):
    from app.services.upload_service import UploadService
    device = await DeviceService.get_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    update_data = {}
    if "template_id" in data:
        update_data["template_id"] = data["template_id"]
        update_data["template_status"] = "SELECTED" if data["template_id"] else "TEMPLATE_REQUIRED"
        
    await DeviceService.update_device(device_id, update_data)
    await UploadService.refresh_upload_template_status(device["upload_id"])
    
    return await DeviceService.get_device(device_id)

@router.get("/api/devices/{device_id}/download")
async def download_device_config(device_id: str):
    device = await DeviceService.get_device(device_id)
    if device["processing_status"] != "SUCCESS":
        raise HTTPException(
            status_code=409,
            detail="Device analysis is still in progress"
        )
    return await FileService.download_device(
        device_id
    )

@router.get(
    "/api/devices/{device_id}/configuration"
)
async def view_configuration(device_id: str):
    device = await DeviceService.get_device(device_id)
    if device["processing_status"] != "SUCCESS":
        raise HTTPException(
            status_code=409,
            detail="Device analysis is still in progress"
        )
    file_path = device["file_path"]

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Configuration file not found"
        )

    with open(file_path,"r",encoding="utf-8",errors="ignore") as f:
        content = f.read()

    return {
        "device_id": device_id,
        "device_name": device["device_name"],
        "configuration": content
    }