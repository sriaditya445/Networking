from pydantic import BaseModel,Field
from datetime import datetime
from typing import Dict, List, Any


class AuditReportModel(BaseModel):

    device_id: str
    audit_result_id: str
    created_at: datetime    