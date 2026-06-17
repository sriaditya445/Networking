from app.repositories.upload_repository import (
    UploadRepository
)

from app.services.device_service import DeviceService

class StatsService:

    @staticmethod
    async def get_stats():

        try:
            total_uploads = await  UploadRepository. count({})
            pending_uploads = await  UploadRepository. count({"status": {"$in": ["pending", "processing"]}})
            # processing_uploads = await  UploadRepository. count({"status": "processing"})
            success_uploads = await  UploadRepository. count({"status": "success"})
            failed_uploads = await  UploadRepository. count({"status": "failed"})

            total_devices = await DeviceService.count_devices()
            switches = await DeviceService.count_devices({"device_type": "Switch"})
            routers = await DeviceService.count_devices({"device_type": "Router"})
            firewalls = await DeviceService.count_devices({"device_type": "Firewall"})
            
            # Everything else (Access Points, Unknowns, Pending Analysis)
            unknowns = await DeviceService.count_devices({
                "device_type": {"$nin": ["Switch", "Router", "Firewall"]}
            })

            return {
                "total_uploads": total_uploads,
                # "pending_uploads": pending_uploads + processing_uploads,
                "pending_uploads": pending_uploads,
                "success_uploads": success_uploads,
                "failed_uploads": failed_uploads,
                "total_devices": total_devices,
                "switches_count": switches,
                "routers_count": routers,
                "firewalls_count": firewalls,
                "unknowns_count": unknowns
            }

        except Exception as e:
            logger.error(f"Error fetching stats: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve system statistics."
            )