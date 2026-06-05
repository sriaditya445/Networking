from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List


class AuditFindingModel(BaseModel):
    """Model for individual compliance finding from audit."""
    device_id: str
    upload_id: str
    rule_id: str
    section: str  # SSH, AAA, NTP, SNMP, Logging, etc.
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    status: str  # PASS, FAIL, NOT_APPLICABLE
    expected: Optional[str] = None
    actual: Optional[str] = None
    remediation: str
    evidence: Optional[str] = None
    audit_batch_id: str
    created_at: datetime = datetime.utcnow()


class AuditReportModel(BaseModel):
    """Model for device compliance audit report."""
    device_id: str
    upload_id: str
    device_name: str
    device_type: str
    vendor: str
    audit_score: float  # 0-100
    risk_score: float  # 0-100
    compliance_status: str  # COMPLIANT, NON_COMPLIANT, PARTIALLY_COMPLIANT
    summary: Dict[str, int] = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "info": 0
    }
    findings_count: int
    passed_rules: int
    failed_rules: int
    not_applicable_rules: int
    executive_summary: str
    findings_ids: List[str] = []  # FK to audit_findings
    generated_at: datetime = datetime.utcnow()
    generated_by: str  # batch_job_id


class BatchJobModel(BaseModel):
    """Model for batch job tracking (audit, report generation, etc)."""
    batch_id: str  # UUID or unique identifier
    upload_id: str
    job_type: str  # AUDIT, REPORT, EXTRACTION, PARSING
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_items: int
    processed_items: int = 0
    failed_items: int = 0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = {}  # Job-specific data
    created_at: datetime = datetime.utcnow()


class GoldenTemplateModel(BaseModel):
    """Model for golden configuration templates."""
    name: str
    device_type: str  # Switch, Router, Firewall, AccessPoint
    vendor: str  # Cisco, Juniper, etc.
    template_raw: str  # Raw template text with {{PLACEHOLDERS}}
    template_json: Optional[Dict[str, Any]] = None  # Parsed JSON structure
    placeholders: List[str] = []  # List of placeholder names
    version: str = "1.0"
    description: str = ""
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()


class ComplianceScoreModel(BaseModel):
    """Model for compliance scores and metrics."""
    device_id: str
    upload_id: str
    device_name: str
    score: float
    risk_level: str  # CRITICAL, HIGH, MEDIUM, LOW, MINIMAL
    components: Dict[str, float] = {}  # Score by section (SSH: 80, AAA: 90, etc.)
    trend: str = "STABLE"  # IMPROVING, STABLE, DEGRADING
    previous_score: Optional[float] = None
    calculated_at: datetime = datetime.utcnow()


class ComplianceFindingSummary(BaseModel):
    """Summary statistics for compliance findings."""
    total_findings: int
    passed_rules: int
    failed_rules: int
    not_applicable_rules: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    by_section: Dict[str, Dict[str, int]] = {}  # Section → severity → count
