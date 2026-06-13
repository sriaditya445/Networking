from datetime import datetime

from app.models.audit_result_model import (
    AuditResultModel
)

from app.repositories.audit_result_repository import (
    AuditResultRepository
)


class AuditResultService:

    @staticmethod
    async def create_result(
        device: dict,
        audit_result: dict
    ):

        result_doc = AuditResultModel(
            device_id=str(device["_id"]),
            template_id=device["template_id"],
            audit_mode="full",
            overall_score=audit_result["score"],
            category_scores=audit_result[
                "category_scores"
            ],
            passed_rules=audit_result[
                "passed"
            ],
            failed_rules=audit_result[
                "failed"
            ],
            created_at=datetime.utcnow()
        )

        result = await AuditResultRepository.create(
            result_doc.model_dump()
        )

        return str(result.inserted_id)

    @staticmethod
    async def get_result(
        result_id: str
    ):

        return await AuditResultRepository.get_by_id(
            result_id
        )

    @staticmethod
    async def get_device_results(
        device_id: str
    ):

        return await AuditResultRepository.get_by_device_id(
            device_id
        )

    @staticmethod
    async def get_all_results():

        return await AuditResultRepository.get_all()