from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, List, Any


class AuditFindingSchema(BaseModel):
    """API response schema for audit finding."""
    _id: Optional[str] = None
    device_id: str
    rule_id: str
    section: str
    severity: str
    status: str
    expected: Optional[str]
    actual: Optional[str]
    remediation: str
    evidence: Optional[str]
    created_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "rule_id": "SSH_VERSION_2",
                "section": "SSH",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected": "SSH version 2 only",
                "actual": "SSH version 1 configured",
                "remediation": "Configure 'ip ssh version 2'",
                "evidence": "ssh version 1"
            }
        }


class AuditReportSchema(BaseModel):
    """API response schema for audit report."""
    _id: Optional[str] = None
    device_id: str
    device_name: str
    device_type: str
    vendor: str
    audit_score: float
    risk_score: float
    compliance_status: str
    summary: Dict[str, int]
    findings_count: int
    passed_rules: int
    failed_rules: int
    not_applicable_rules: int
    executive_summary: str
    findings: List[AuditFindingSchema] = []
    generated_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "device_name": "SWITCH-01",
                "device_type": "Switch",
                "vendor": "Cisco",
                "audit_score": 85,
                "risk_score": 15,
                "compliance_status": "PARTIALLY_COMPLIANT",
                "summary": {
                    "critical": 1,
                    "high": 3,
                    "medium": 5,
                    "low": 2,
                    "info": 0
                }
            }
        }


class BatchJobSchema(BaseModel):
    """API response schema for batch job."""
    _id: Optional[str] = None
    batch_id: str
    upload_id: str
    job_type: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_items: int
    processed_items: int
    failed_items: int
    error_message: Optional[str]
    progress_percentage: float = 0.0

    class Config:
        json_schema_extra = {
            "example": {
                "batch_id": "audit_20260605_001",
                "job_type": "AUDIT",
                "status": "PROCESSING",
                "total_items": 50,
                "processed_items": 35,
                "failed_items": 1,
                "progress_percentage": 70.0
            }
        }


class ComplianceSummarySchema(BaseModel):
    """Summary of compliance across all devices."""
    total_devices: int
    average_audit_score: float
    devices_compliant: int
    devices_non_compliant: int
    critical_findings_total: int
    high_findings_total: int
    devices_with_critical: int
    compliance_distribution: Dict[str, int]  # COMPLIANT → count

    class Config:
        json_schema_extra = {
            "example": {
                "total_devices": 100,
                "average_audit_score": 78.5,
                "devices_compliant": 65,
                "devices_non_compliant": 35,
                "critical_findings_total": 15,
                "high_findings_total": 45,
                "devices_with_critical": 8
            }
        }


class AuditStartRequestSchema(BaseModel):
    """Request schema for starting audit batch."""
    upload_id: Optional[str] = None
    device_ids: Optional[List[str]] = None
    golden_template_id: str
    custom_rules: Optional[Dict[str, Any]] = None


class ComplianceScoreSchema(BaseModel):
    """Compliance score details."""
    device_id: str
    device_name: str
    score: float
    risk_level: str
    score_breakdown: Dict[str, float]  # Section → score
    previous_score: Optional[float]
    score_trend: str
    calculated_at: datetime


class TemplateComparisonSchema(BaseModel):
    """Result of comparing device config with golden template."""
    device_id: str
    device_name: str
    template_name: str
    match_percentage: float
    matched_sections: List[str]
    missing_sections: List[str]
    extra_sections: List[str]
    differences: Dict[str, Dict[str, Any]]


class RemediationRecommendationSchema(BaseModel):
    """Remediation recommendation for a finding."""
    priority: int  # 1 = highest
    finding_rule_id: str
    section: str
    severity: str
    recommended_action: str
    estimated_effort: str  # LOW, MEDIUM, HIGH
    risk_if_not_addressed: str
    implementation_steps: List[str]
    expected_outcome: str


class AuditReportDownloadSchema(BaseModel):
    """Response for report download endpoint."""
    file_name: str
    file_size: int
    format: str  # json, pdf, excel
    content_type: str
    download_url: str
