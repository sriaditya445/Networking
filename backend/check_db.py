import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_jobs():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["network_parser_db"]
    from app.core.database import uploads_collection, devices_collection
    
    uploads = await uploads_collection.find().to_list(100)
    for u in uploads:
        print(f"Upload {u.get('_id')} status: {u.get('status')}, error: {u.get('error_message')}")
            
    devices = await devices_collection.find().to_list(10) # limit to 10 to avoid huge output
    for d in devices:
        print(f"Device {d.get('_id')} status: {d.get('status')}, audit_status: {d.get('audit_status')}, error: {d.get('error_message')}")

if __name__ == "__main__":
    asyncio.run(check_jobs())
