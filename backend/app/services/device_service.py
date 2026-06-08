from app.repositories.device_repository import DeviceRepository
from bson import ObjectId
from fastapi import HTTPException

class DeviceService:

    @staticmethod
    async def create_device(device_doc: dict):
        return await DeviceRepository.create(device_doc)

    @staticmethod
    async def get_device(device_id: str):
        """Return a single device by id, raise HTTPException if not found or id invalid."""
        if not device_id:
            raise HTTPException(status_code=400, detail="device_id is required")

        if not ObjectId.is_valid(device_id):
            raise HTTPException(status_code=400, detail="Invalid device_id")

        device = await DeviceRepository.get_by_id(device_id)
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        return device


    @staticmethod
    async def get_devices(
        device_id: str = None,
        upload_id: str = None,
        status: str = None,
        audit_status: str = None,
        processing_stage: str = None
    ):

        if device_id and upload_id:
            raise HTTPException(
                status_code=400,
                detail="Provide either device_id or upload_id, not both"
            )

        if device_id:

            if not ObjectId.is_valid(device_id):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid device_id"
                )

            device = await DeviceRepository.get_by_id(
                device_id
            )

            if not device:
                raise HTTPException(
                    status_code=404,
                    detail="Device not found"
                )

            return device

        query = {}

        if upload_id:
            query["upload_id"] = upload_id

        if status:
            query["status"] = status

        if audit_status:
            query["audit_status"] = audit_status

        if processing_stage:
            query["processing_stage"] = processing_stage

        return await DeviceRepository.get_all(query)

    @staticmethod
    async def find_pending_by_upload(upload_id: str):
        """Find staged/pending devices for a given upload (compat supports old `status` and new `batch_status`)."""
        query = {"upload_id": upload_id}
        # Try new batch_status first
        query_batch = query.copy()
        query_batch["batch_status"] = "PENDING"
        devices = await DeviceRepository.get_all(query_batch)
        if devices:
            return devices

        # Fallback to old status field
        query_old = query.copy()
        query_old["status"] = "pending"
        return await DeviceRepository.get_all(query_old)

    @staticmethod
    async def update_after_parse(device_id: str, parsed_payload: dict):
        """Update device doc after parsing finished."""
        data = parsed_payload.copy()
        # mark batch as succeeded for this device and queue for audit
        data.update({
            "status": None,
            "batch_status": "SUCCESS",
            "processing_stage": "PENDING_AUDIT",
            "parsed_at": parsed_payload.get("parsed_at")
        })
        return await DeviceRepository.update(device_id, data)

    @staticmethod
    async def update_after_audit(device_id: str, audit_result: dict, success: bool = True):
        """Update device doc after audit finished."""
        data = {
            "audit_result": audit_result,
            "audit_score": audit_result.get("score"),
            "audit_summary": audit_result.get("summary"),
            "findings": audit_result.get("findings"),
            "audit_status": "SUCCESS" if success else "FAILED",
            "processing_stage": "COMPLETED" if success else "FAILED"
        }
        return await DeviceRepository.update(device_id, data)

    @staticmethod
    async def update_device(device_id: str, data: dict):
        return await DeviceRepository.update(device_id,data)

    @staticmethod
    async def delete_devices_by_upload_id(upload_id: str):
        return await DeviceRepository.delete_by_upload_id(upload_id)

    @staticmethod
    async def count_devices(query: dict = None):
        return await DeviceRepository.count(query or {})

            
    # @staticmethod
    # async def get_devices( upload_id:str = None , status: str = None):
    #     query = {}
    #     if upload_id:
    #         query["upload_id"] = upload_id
    #     if status:
    #         query["status"] = status
    #     return await DeviceRepository.get_all(query)