# scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.workers.processing_tasks import (
    process_uploaded_jobs,
    process_pending_uploads,
    process_pending_audits
)

scheduler = AsyncIOScheduler()

scheduler.add_job(
    process_uploaded_jobs,
    trigger="interval",
    seconds=20,
    id="extraction_batch_job"
)
 
scheduler.add_job(
    process_pending_uploads,
    "interval",
    seconds=30,
    id="parser_batch_job"
)

scheduler.add_job(
    process_pending_audits,
    "interval",
    seconds=40,
    id="audit_batch_job"
)

