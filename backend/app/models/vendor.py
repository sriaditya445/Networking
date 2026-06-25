from datetime import datetime
from pydantic import BaseModel


class VendorModel(BaseModel):

    vendor_name: str
    vendor_code: str

    contact_person: str
    email: str
    phone: str

    status: str = "ACTIVE"

    created_at: datetime
    updated_at: datetime