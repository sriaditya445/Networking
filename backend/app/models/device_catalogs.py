from pydantic import BaseModel,Field
from datetime import datetime

class DeviceCatalogModel(BaseModel):

    vendor_id: str

    family: str

    model: str

    device_type: str

    role: str | None = None

    os: str | None = None

    # supported: bool = True

    template_family: str | None = None

    created_at: datetime

    updated_at: datetime

# DeviceDetector
#     ↓
# DeviceCatalog
#     ↓
# metadata

