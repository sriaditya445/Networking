from typing import List, Optional

from fastapi import APIRouter

from app.schemas.device_schema import (
    DeviceResponse
)

from app.services.device_service import (
    DeviceService
)

from fastapi.responses import FileResponse
from fastapi import HTTPException

from app.services.file_service import (
    FileService
)

router = APIRouter()

@router.get("/api/devices")
async def get_devices(
    device_id: Optional[str] = None,
    upload_id: Optional[str] = None
):
    return await DeviceService.get_devices(
        device_id=device_id,
        upload_id=upload_id
    )

@router.get("/api/devices/{device_id}/download")
async def download_device_config(device_id: str):
    return await FileService.download_device(
        device_id
    )
