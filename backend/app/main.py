from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.upload_routes import router as upload_router
from app.api.routes.device_routes import router as device_router
from app.api.routes.stats_routes import router as stats_router
from app.api.routes.health_routes import router as health_router
from app.api.routes.report_routes import router as report_router

from app.core.database import check_db_connection
from app.workers.scheduler import scheduler

app = FastAPI(
    title="Network Configuration Processing System",
    description="FastAPI Backend for parsing Cisco/Juniper networking files",
    version="1.0.0"
)

@app.on_event("startup")
async def startup():

    scheduler.start()

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
app.include_router(report_router)

