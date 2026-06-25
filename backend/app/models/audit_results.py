from pydantic import BaseModel,Field
from datetime import datetime
from typing import Dict, List, Any


class AuditResultModel(BaseModel):
    device_id: str
    device_name: str
    group_id: str
    template_id: str

    audit_mode: str
    selected_sections: List[str] = Field(default_factory=list)

    overall_score: float
    category_scores: Dict[str, float]

    passed: List[Dict[str, Any]]
    failed: List[Dict[str, Any]]

    severity_summary: Dict[str, int]

    created_at: datetime