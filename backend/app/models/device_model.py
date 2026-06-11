from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List

class DeviceModel(BaseModel):
    upload_id: str

    device_name: str
    device_type: str

    configuration: Optional[str] = None
    configuration_json: Optional[Dict[str, Any]] = None

    processing_status: str = "PENDING"
    template_status: str = "PENDING_TEMPLATE_SELECTION"
    audit_status: str = "PENDING"

    file_path: str

    audit_result: Optional[Dict[str, Any]] = None
    findings: Optional[List[Dict[str, Any]]] = None

    error_message: Optional[str] = None

    created_at: datetime
    updated_at: datetime


# class DeviceModel(BaseModel):
#     upload_id: str
#     device_name: str
#     device_type: str
#     configuration: str
#     status: str
#     file_path: str
#     error_message: Optional[str] = None
#     parsed_at: Optional[datetime] = None
#     parsed_data: Optional[Dict[str, Any]] = None
#     configuration_json: Optional[Dict[str, Any]] = None  # NEW: Hierarchical JSON structure
#     audit_result: Optional[Dict[str, Any]] = None  # NEW: Full audit output from comparison_engine
#     audit_status: str = "PENDING"
#     audit_score: Optional[float] = None
#     audit_summary: Optional[Dict[str, int]] = None
#     findings: Optional[List[Dict[str, Any]]] = None