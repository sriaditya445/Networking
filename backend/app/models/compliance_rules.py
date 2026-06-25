class ComplianceRuleModel(BaseModel):

    rule_id: str

    vendor_id: str | None
    family: str | None

    model: str | None

    device_type: str | None

    role: str | None

    device_type: str | None

    category: str

    severity: str

    control: str

    recommendation: str

    remediation: str

    enabled: bool = True