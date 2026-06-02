# scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.workers.device_worker import process_pending_jobs

scheduler = AsyncIOScheduler()

scheduler.add_job(
    process_pending_jobs,
    trigger="interval",
    minutes=1,
    id="device_batch_job"
)
 
scheduler.start()