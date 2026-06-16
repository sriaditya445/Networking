from pydantic import BaseModel
from datetime import datetime
from typing import Dict, List, Optional


class GoldenTemplateModel(BaseModel):

    vendor: str
    device_type: str
    model: Optional[str]

    template_name: str
    template_type: str = "jinja2"
    template_content: str

    sections: Dict[str, List[str]] = {}

    created_at: datetime

    updated_at: datetime