from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

class DeviceModel(BaseModel):
    upload_id: str
    # extracted_variables
    # Device Identification
    device_name: str
    device_type: str
    vendor_id: str
    family: str | None = None
    model: Optional[str] = None
    role: str | None = None

    os: str | None = None

    version: str | None = None
    group_id: Optional[str] = None
    # Raw Config
    configuration_json: Optional[Dict[str, Any]] = None

    # Upload File
    file_path: str

    # Processing Status
    processing_status: str = "PENDING"

    # Template Selection
    template_status: str = "PENDING_TEMPLATE_SELECTION"
    template_id: Optional[str] = None

    # configuration: Optional[str] = None
    template_name: Optional[str] = None
    audit_selection_done: bool = False

    # Audit Status
    audit_status: str = "PENDING"

    # Audit Results
    audit_score: Optional[float] = None
    audit_report_id: Optional[str] = None
    audit_result_id: Optional[str] = None

    # Errors
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # class DeviceModel(BaseModel):

    # upload_id: str

    # device_name: str

    # vendor: str

    # family: str

    # model: str

    # device_type: str

    # role: str

    # group_id: str | None = None

    # configuration_json: dict | None = None

    # file_path: str

    # processing_status: str = "PENDING"

    # template_id: str | None = None

    # template_status: str = "PENDING"

    # audit_status: str = "PENDING"

    # audit_result_id: str | None = None

    # audit_report_id: str | None = None

    # created_at: datetime
    # updated_at: datetime