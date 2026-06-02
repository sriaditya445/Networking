from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UploadModel(BaseModel):
    folder_name: str
    status: str
    files_count: int
    folder_path: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime