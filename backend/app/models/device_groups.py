class DeviceGroupModel(BaseModel):

    upload_id: str

    vendor_id: str
    family: str
    model: str | None
    device_type: str
    role: str | None
    template_family: str | None = None
    template_id: str | None

    template_status: str

    audit_mode: str | None

    selected_sections: list[str]

    device_count: int

    created_at: datetime
    updated_at: datetime