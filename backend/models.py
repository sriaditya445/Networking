from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, Annotated, List
from datetime import datetime

# Custom type to convert MongoDB ObjectId to string automatically in Pydantic serialization
PyObjectId = Annotated[str, BeforeValidator(str)]

class UploadJobResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    folder_name: str
    status: str  # "pending", "processing", "success", "failed"
    files_count: int
    folder_path: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
        arbitrary_types_allowed = True

class DeviceResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    upload_id: str
    device_name: str
    device_type: str  # "Switch", "Router", "Firewall", "Unknown"
    configuration: str
    status: str  # "pending", "success", "failed"
    file_path: str
    error_message: Optional[str] = None
    parsed_at: Optional[datetime] = None
    parsed_data: Optional[dict] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
        arbitrary_types_allowed = True

class StatsResponse(BaseModel):
    total_jobs: int
    pending_jobs: int
    success_jobs: int
    failed_jobs: int
    total_devices: int
    switches_count: int
    routers_count: int
    firewalls_count: int
    unknowns_count: int
