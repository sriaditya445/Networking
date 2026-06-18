from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

class DeviceResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    upload_id: str

    device_name: str
    device_type: str | None = None
    vendor: str | None = None
    model: str | None = None

    audit_score: float | None = None
    display_status: str | None = None

    error_message: str | None = None

    created_at: datetime | None = None
    updated_at: datetime | None = None