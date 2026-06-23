from fastapi import HTTPException, status

from app.core.database import logger
from app.services.upload_service import UploadService
from app.services.device_service import DeviceService


class StatsService:

    @staticmethod
    async def get_stats():

        try:

            total_uploads = await UploadService.count_uploads({})

            pending_uploads = await UploadService.count_uploads(
                {
                    "status": {
                        "$in": [
                            "NEW",
                            "PENDING_EXTRACTION",
                            "EXTRACTING",
                            "ANALYZING_DEVICES",
                            "WAITING_TEMPLATE_CREATION",
                            "WAITING_AUDIT_SELECTION",
                            "READY_FOR_AUDIT",
                            "AUDIT_IN_PROGRESS"
                        ]
                    }
                }
            )

            success_uploads = await UploadService.count_uploads(
                {
                    "status": "COMPLETED"
                }
            )

            failed_uploads = await UploadService.count_uploads(
                {
                    "status": "FAILED"
                }
            )

            total_devices = await DeviceService.count_devices()

            switches = await DeviceService.count_devices(
                {"device_type": "switch"}
            )

            routers = await DeviceService.count_devices(
                {"device_type": "router"}
            )

            firewalls = await DeviceService.count_devices(
                {"device_type": "firewall"}
            )

            unknowns = await DeviceService.count_devices(
                {
                    "device_type": {
                        "$nin": [
                            "switch",
                            "router",
                            "firewall"
                        ]
                    }
                }
            )

            return {
                "total_uploads": total_uploads,
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

            logger.error(
                f"Error fetching stats: {e}"
            )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve system statistics."
            )