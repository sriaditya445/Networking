from datetime import datetime

from app.models.audit_results import (
    AuditResultModel
)

from app.repositories.audit_result_repository import (
    AuditResultRepository
)
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService

class AuditResultService:

    @staticmethod
    async def create_result(
        device: dict,
        audit_result: dict,
        audit_mode: str,
        selected_sections: list[str]
    ):

        result_doc = AuditResultModel(
            device_id=str(device["_id"]),
            device_name=device["device_name"],
            group_id=device["group_id"],
            template_id=device["template_id"],
            audit_mode=audit_mode,
            selected_sections=selected_sections,
            overall_score=audit_result["score"],
            category_scores=audit_result["category_scores"],
            passed=audit_result["passed"],
            failed=audit_result["failed"],
            created_at=datetime.utcnow()
        )

        result = await AuditResultRepository.create(
            result_doc.model_dump()
        )

        return str(result.inserted_id)

    @staticmethod
    async def get_result(result_id: str):
        return await AuditResultRepository.get_by_id(
            result_id
        )

    @staticmethod
    async def get_device_results(device_id: str):
        return await AuditResultRepository.get_by_device_id(
            device_id
        )

    @staticmethod
    async def get_all_results():
        return await AuditResultRepository.get_all()

    @staticmethod
    async def delete_result(result_id: str):
        await AuditResultRepository.delete(
            result_id
        )

    @staticmethod
    async def get_upload_results(upload_id: str):

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        results = []

        for device in devices:
            device_results = await AuditResultRepository.get_by_device_id(
                str(device["_id"])
            )
            results.extend(device_results)

        return results
