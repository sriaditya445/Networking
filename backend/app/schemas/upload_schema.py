from pydantic import BaseModel, Field, BeforeValidator,ConfigDict
from typing import Optional, Annotated,List
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

class UploadResponse(BaseModel):

    model_config = ConfigDict(
        populate_by_name=True
    )

    id: PyObjectId = Field(alias="_id")
    folder_name: str
    status: str
    total_devices: int = 0
    created_at: datetime 
    updated_at: datetime 
    error_message: str | None = None