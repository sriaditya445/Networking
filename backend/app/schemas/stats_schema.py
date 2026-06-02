from pydantic import BaseModel

class StatsResponse(BaseModel):
    total_jobs: int
    pending_jobs: int
    success_jobs: int
    failed_jobs: int
    total_devices: int
    switches_count: int
    routers_count: int
    firewalls_count: int
    unknowns_count: int