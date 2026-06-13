from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UploadModel(BaseModel):
    folder_name: str
    status: str = "NEW"
    files_count: int
    folder_path: Optional[str] = None
    error_message: Optional[str] = None
    total_devices: int = 0  # NEW: Total device count for this upload
    parsed_success_count: int = 0  # NEW: Successfully parsed devices
    parsed_failed_count: int = 0  # NEW: Failed to parse devices
    audit_success_count: int = 0  # NEW: Successfully audited devices
    audit_failed_count: int = 0  # NEW: Failed audit devices
    template_success_count: int = 0
    template_failed_count: int = 0
    created_at: datetime
    updated_at: datetime
