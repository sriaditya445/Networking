import asyncio
from app.workers.parser_worker import ParserWorker
from app.core.database import uploads_collection

async def run():
    uploads = await uploads_collection.find({"status": "staged"}).to_list(100)
    for u in uploads:
        print(f"Processing upload {u['_id']}")
        await ParserWorker.process_upload_job(str(u['_id']))

if __name__ == "__main__":
    asyncio.run(run())
