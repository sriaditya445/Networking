from fastapi import APIRouter

from app.services.device_detector import detect_device_type

router = APIRouter(prefix="/api/detect", tags=["Device Detection"])


@router.post("", summary="Detect device type from configuration content")
async def detect_device(config_content: str):
    result = detect_device_type(config_content)
    return {
        "device_type": result.device_type,
        "vendor": result.vendor,
        "confidence": result.confidence,
        "matched_patterns": result.matched_patterns,
    }
