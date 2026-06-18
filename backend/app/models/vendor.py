from datetime import datetime
from typing import Optional

from pydantic import BaseModel

class VendorModel(BaseModel):

    vendor_name: str

    vendor_code: str

    description: Optional[str] = None

    is_active: bool = True

    created_at: datetime
    updated_at: datetime