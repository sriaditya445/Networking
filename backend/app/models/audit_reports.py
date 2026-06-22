from pydantic import BaseModel,Field
from datetime import datetime
from typing import Dict, List, Any


class AuditReportModel(BaseModel):

    device_id: str
    audit_result_id: str
    # report_name: str | None = None
    created_at: datetime

    # device_name: str
    # group_id: str
    # vendor: str
    # device_type: str
    # template_id: str

    # audit_mode: str
    # selected_sections: List[str] = Field(default_factory=list)

    # overall_score: float
    # category_scores: Dict[str, float]

    # passed: List[Dict[str, Any]]
    # failed: List[Dict[str, Any]]

    # recommendations: List[Dict[str, Any]]

    