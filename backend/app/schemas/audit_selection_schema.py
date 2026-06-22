# schemas/audit_selection_schema.py

from pydantic import BaseModel
from typing import List, Optional

class AuditSelection(BaseModel):
    group_id: str
    audit_mode: str
    selected_sections: List[str] = []

class AuditSelectionRequest(BaseModel):

    selections: List[AuditSelection]