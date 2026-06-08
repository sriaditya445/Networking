from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List

class DeviceModel(BaseModel):
    upload_id: str
    device_name: str
    device_type: str
    configuration: str
    # Deprecated developer-facing status retained for backwards compatibility
    status: Optional[str] = "PENDING"
    # User-facing fields
    batch_status: str = "PENDING"        # PENDING | PROCESSING | COMPLETED
    audit_status: str = "PENDING"        # PENDING | RUNNING | SUCCESS | FAILED
    processing_stage: str = "QUEUED"     # QUEUED | PARSING | AUDITING | COMPLETED | FAILED
    file_path: str
    error_message: Optional[str] = None
    parsed_at: Optional[datetime] = None
    parsed_data: Optional[Dict[str, Any]] = None
    configuration_json: Optional[Dict[str, Any]] = None  # NEW: Hierarchical JSON structure
    audit_result: Optional[Dict[str, Any]] = None  # NEW: Full audit output from comparison_engine
    audit_score: Optional[float] = None
    audit_summary: Optional[Dict[str, int]] = None
    findings: Optional[List[Dict[str, Any]]] = None