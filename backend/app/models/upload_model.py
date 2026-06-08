from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UploadModel(BaseModel):
    folder_name: str
    status: str
    files_count: int
    folder_path: Optional[str] = None
    error_message: Optional[str] = None
    total_devices: int = 0  # NEW: Total device count for this upload
    # Aggregate counters (keep only aggregated counts)
    batch_success_count: int = 0  # Successfully parsed / processed devices in batch
    batch_failed_count: int = 0
    audit_success_count: int = 0  # Successfully audited devices
    audit_failed_count: int = 0  # Failed audit devices
    created_at: datetime
    updated_at: datetime