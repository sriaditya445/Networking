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



# class UploadJobResponse(BaseModel):
#     id: PyObjectId = Field(alias="_id")
#     folder_name: str
#     status: str  # "pending", "processing", "success", "failed"
#     files_count: int
#     folder_path: Optional[str] = None
#     error_message: Optional[str] = None
#     created_at: datetime
#     updated_at: datetime

#     class Config:
#         populate_by_name = True
#         json_encoders = {datetime: lambda v: v.isoformat()}
#         arbitrary_types_allowed = True
