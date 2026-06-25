from pydantic import BaseModel,Field
from datetime import datetime
from typing import Dict, List, Optional


class GoldenTemplateModel(BaseModel):
    # vendor_id
    vendor_id: str
    device_type: str
    family: str | None = None

    model: str | None = None

    role: str | None = None
    template_family: str | None = None
    template_name: str
    template_type: str = "jinja2"
    template_content: str

    sections: Dict[str, List[str]] = Field(default_factory=dict)

    created_at: datetime

    updated_at: datetime

# class GoldenTemplateModel(BaseModel):

#     vendor: str

#     family: str | None = None

#     model: str | None = None

#     role: str | None = None

#     template_name: str

#     template_content: str

#     sections: dict[str, list[str]]

#     created_at: datetime
#     updated_at: datetime