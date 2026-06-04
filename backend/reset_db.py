import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def reset_failed_jobs():
    # MongoDB Connection
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["network_parser_db"] # Actually let's check settings.py for the real DB name
    
    # Just import from app.core.database to be safe
    from app.core.database import uploads_collection, devices_collection
    
    uploads = await uploads_collection.find().to_list(100)
    for u in uploads:
        print(f"Upload {u.get('_id')} status: {u.get('status')}, error: {u.get('error_message')}")
        if u.get('status') == 'failed':
            print("Resetting upload to staged...")
            await uploads_collection.update_one({'_id': u['_id']}, {'$set': {'status': 'staged', 'error_message': None}})
            
    devices = await devices_collection.find().to_list(100)
    for d in devices:
        print(f"Device {d.get('_id')} status: {d.get('status')}, error: {d.get('error_message')}")
        if d.get('status') == 'failed':
            print("Resetting device to pending...")
            await devices_collection.update_one({'_id': d['_id']}, {'$set': {'status': 'pending', 'error_message': None}})

if __name__ == "__main__":
    asyncio.run(reset_failed_jobs())
