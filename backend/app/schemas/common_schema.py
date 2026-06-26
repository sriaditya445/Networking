from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field,ConfigDict, BeforeValidator
from typing import Annotated
PyObjectId = Annotated[str, BeforeValidator(str)]

class ActionResponse(BaseModel):
    message: str
    id: str

class DeviceType(str, Enum):
    SWITCH = "switch"
    ROUTER = "router"
    WLC = "wlc"
    NEXUS = "nexus"
    FIREWALL = "firewall"
    UNKNOWN = "unknown"


class Vendor(str, Enum):
    CISCO = "Cisco"
    JUNIPER = "Juniper"
    ARISTA = "Arista"
    PALO_ALTO = "Palo Alto"
    FORTINET = "Fortinet"


class AuditCategory(str, Enum):
    AAA = "aaa"
    SECURITY = "security"
    SNMP = "snmp"
    NTP = "ntp"
    DNS = "dns"
    LOGGING = "logging"
    LAYER2 = "layer2"
    LAYER3 = "layer3"
    WIRELESS = "wireless"
    PERFORMANCE = "performance"
    INTERFACES = "interfaces"
    HIGH_AVAILABILITY = "high_availability"


class AuditMode(str, Enum):
    FULL = "full"
    SELECTED = "selected"
    AAA = "aaa"
    SECURITY = "security"
    SNMP = "snmp"
    NTP = "ntp"
    DNS = "dns"
    LOGGING = "logging"
    LAYER2 = "layer2"
    LAYER3 = "layer3"
    WIRELESS = "wireless"
    PERFORMANCE = "performance"
    INTERFACES = "interfaces"


class RuleResult(BaseModel):
    rule: str
    category: str
    status: str
    recommendation: str | None = None
    remediation: str | None = None


class CategoryScores(BaseModel):
    aaa: float = 0
    security: float = 0
    snmp: float = 0
    ntp: float = 0
    dns: float = 0
    logging: float = 0
    layer2: float = 0
    layer3: float = 0
    wireless: float = 0
    performance: float = 0
    interfaces: float = 0
    high_availability: float = 0


class AuditResultResponse(BaseModel):
    id: str | None = None
    device_name: str
    device_type: str
    vendor: str = "Cisco"
    overall_score: float
    category_scores: dict[str, float]
    passed: list[RuleResult]
    failed: list[RuleResult]
    # recommendations: list[RuleResult]
    audit_mode: str = "full"
    created_at: datetime | None = None

class AuditReportResponse(BaseModel):
    id: str
    device_id: str
    audit_result_id: str
    created_at: datetime

class GoldenTemplateListResponse(BaseModel):
    id: str
    vendor: str
    device_type: str
    model: str | None = None
    template_name: str
    template_type: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

class GoldenTemplateCreate(BaseModel):
    vendor: Vendor = Vendor.CISCO
    device_type: DeviceType
    model: str | None = None
    template_name: str
    template_type: str = "jinja2"
    template_content: str
    sections: dict[str, list[str]] = Field(default_factory=dict)


class GoldenTemplateResponse(GoldenTemplateCreate):
    id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class DeviceConfigResponse(BaseModel):
    id: str
    device_name: str
    device_type: str
    vendor: str
    file_path: str
    detected_at: datetime | None = None


class ComplianceTrendPoint(BaseModel):
    date: str
    overall_score: float
    device_count: int


class DashboardStats(BaseModel):
    total_devices: int
    total_audits: int
    average_compliance: float
    total_templates: int
    recent_reports: list[AuditResultResponse]
    compliance_trends: list[ComplianceTrendPoint]
    device_inventory: list[dict[str, Any]]

class VendorCreate(BaseModel):

    vendor_name: str
    vendor_code: str

    contact_person: str

    email: str
    phone: str


class VendorResponse(VendorCreate):

    model_config = ConfigDict(
        populate_by_name=True
    )

    id: PyObjectId = Field(alias="_id")

    status: str

    created_at: datetime | None = None
    updated_at: datetime | None = None


class VendorNameResponse(BaseModel):

    model_config = ConfigDict(
        populate_by_name=True
    )

    id: PyObjectId = Field(alias="_id")
    vendor_name: str
