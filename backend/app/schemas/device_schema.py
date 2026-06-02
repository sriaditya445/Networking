from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

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