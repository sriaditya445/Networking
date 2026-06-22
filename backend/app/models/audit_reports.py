from pydantic import BaseModel,Field
from datetime import datetime
from typing import Dict, List, Any


class AuditReportModel(BaseModel):

    device_id: str
    device_name: str
    vendor: str
    device_type: str
    template_id: str

    audit_mode: str
    selected_sections: List[str] = Field(default_factory=list)

    overall_score: float
    category_scores: Dict[str, float]

    passed: List[Dict[str, Any]]
    failed: List[Dict[str, Any]]

    recommendations: List[Dict[str, Any]]

    created_at: datetime