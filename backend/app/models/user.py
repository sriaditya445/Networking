from datetime import datetime
from pydantic import BaseModel


class UserModel(BaseModel):

    username: str
    email: str

    role: str = "admin"

    is_active: bool = True

    created_at: datetime
    updated_at: datetime