# batch_worker.py 

from app.services.device_service import DeviceService 

async def process_pending_jobs():
    devices = await DeviceService.get_devices(status = "pending")
    for device in devices:
        await DeviceService.update_device(str(device["_id"]),{"status": "processing"})

