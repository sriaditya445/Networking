from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.upload_routes import router as upload_router
from app.api.device_routes import router as device_router
from app.api.stats_routes import router as stats_router
from app.api.health_routes import router as health_router
from app.api.audit_routes import router as audit_router
from app.api.template_routes import router as template_router
from app.api.detect_routes import router as detect_router
from app.api.vendor_routes import router as vendor_router
# from app.api.user_router import router as user_router
from app.services.user_service import UserService
from app.services.vendor_service import (
    VendorService
)
from app.core.database import check_db_connection,connect_db, close_db
from app.workers.scheduler import scheduler

app = FastAPI(
    title="Network Configuration Processing System",
    description="FastAPI Backend for parsing Cisco/Juniper networking files",
    version="1.0.0"
)

@app.on_event("startup")
async def startup():
    await connect_db()
    await UserService.create_system_user()
    await VendorService.create_default_vendors()
    scheduler.start()

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()
    await close_db()

# @app.on_event("startup")
# async def startup():

#     result = await check_db_connection()

#     print(f"MongoDB Connected: {result}")

#     print("\nREGISTERED ROUTES:")

#     for route in app.routes:
#         print(route.path)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(device_router)
app.include_router(stats_router)
app.include_router(health_router)
app.include_router(audit_router)
app.include_router(template_router)
app.include_router(detect_router)
app.include_router(vendor_router)

