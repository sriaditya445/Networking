from pydantic import BaseModel

class StatsResponse(BaseModel):
    total_uploads: int
    pending_uploads: int
    success_uploads: int
    failed_uploads: int
    total_devices: int
    switches_count: int
    routers_count: int
    firewalls_count: int
    unknowns_count: int