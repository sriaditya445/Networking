from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DeviceModel(BaseModel):
    upload_id: str

    # Device Identification
    device_name: str
    device_type: str
    vendor: str = "Cisco"

    # Raw Config
    configuration: Optional[str] = None
    # configuration_json: Optional[Dict[str, Any]] = None

    # Upload File
    file_path: str

    # Processing Status
    processing_status: str = "PENDING"

    # Template Selection
    template_status: str = "PENDING_TEMPLATE_SELECTION"
    template_id: Optional[str] = None
    template_name: Optional[str] = None

    # Audit Status
    audit_status: str = "PENDING"

    # Audit Results
    audit_score: Optional[float] = None
    audit_report_id: Optional[str] = None
    audit_report_id: Optional[str] = None

    # Errors
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime