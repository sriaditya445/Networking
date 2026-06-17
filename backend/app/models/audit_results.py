from pydantic import BaseModel
from datetime import datetime
from typing import Dict, List, Any


class AuditResultModel(BaseModel):

    device_id: str

    template_id: str

    audit_mode: str

    overall_score: float

    category_scores: Dict[str, float]

    passed_rules: List[Dict[str, Any]]

    failed_rules: List[Dict[str, Any]]

    created_at: datetime