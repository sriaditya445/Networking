# schemas/audit_selection_schema.py

from pydantic import BaseModel
from typing import List, Optional


class AuditSelection(BaseModel):

    vendor: str
    device_type: str
    model: Optional[str] = None
    template_id: str
    audit_mode: str
    selected_sections: List[str] = []


class AuditSelectionRequest(BaseModel):

    selections: List[AuditSelection]