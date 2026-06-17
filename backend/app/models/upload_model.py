from datetime import datetime
from typing import Optional

from pydantic import BaseModel

class UploadModel(BaseModel):

    folder_name: str
    status: str = "NEW"

    files_count: int
    folder_path: Optional[str] = None

    error_message: Optional[str] = None

    total_devices: int = 0

    parsed_success_count: int = 0
    parsed_failed_count: int = 0

    audit_success_count: int = 0
    audit_failed_count: int = 0

    audit_selections: list[dict] = []

    created_at: datetime
    updated_at: datetime