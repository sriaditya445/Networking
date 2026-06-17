from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

class DeviceResponse(BaseModel):

    id: PyObjectId = Field(alias="_id")

    upload_id: str

    device_name: str
    vendor: str
    device_type: str
    model: Optional[str] = None

    configuration: Optional[str] = None
    configuration_json: Optional[dict] = None

    processing_status: str
    audit_status: str

    audit_score: Optional[float] = None

    display_status: Optional[str] = None

    error_message: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
