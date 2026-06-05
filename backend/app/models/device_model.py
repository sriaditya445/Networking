from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List

class DeviceModel(BaseModel):
    upload_id: str
    device_name: str
    device_type: str
    vendor: Optional[str] = None  # Cisco, Juniper, etc.
    configuration: str  # Raw configuration text
    status: str
    file_path: str
    error_message: Optional[str] = None
    parsed_at: Optional[datetime] = None
    parsed_data: Optional[Dict[str, Any]] = None
    
    # Structured configuration JSON (NEW)
    configuration_json: Optional[Dict[str, Any]] = None
    
    # Audit fields (moved to separate collections, but kept for backward compatibility)
    audit_status: str = "PENDING"
    audit_score: Optional[float] = None
    audit_summary: Optional[Dict[str, int]] = None
    findings: Optional[List[Dict[str, Any]]] = None
    
    # Cross-collection references (NEW)
    audit_findings_id: Optional[str] = None  # FK to audit_findings_collection
    audit_report_id: Optional[str] = None  # FK to audit_reports_collection
    batch_job_id: Optional[str] = None  # FK to batch_jobs_collection
    
    # Template matching (NEW)
    golden_template_id: Optional[str] = None  # FK to golden_templates_collection
    template_matched: bool = False
    template_match_score: Optional[float] = None  # 0-100
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None