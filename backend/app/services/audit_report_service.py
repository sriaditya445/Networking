from datetime import datetime

from app.models.audit_reports import (
    AuditReportModel
)

from app.repositories.audit_report_repository import (
    AuditReportRepository
)


class AuditReportService:

    @staticmethod
    async def create_report(
        device: dict,
        audit_result: dict,
        audit_mode: str,
        selected_sections: list[str]
    ):

        report_doc = AuditReportModel(
            device_id=str(device["_id"]),
            device_name=device["device_name"],
            vendor=device["vendor"],
            device_type=device["device_type"],
            template_id=device["template_id"],
            audit_mode=audit_mode,
            selected_sections=selected_sections,
            overall_score=audit_result["score"],
            category_scores=audit_result["category_scores"],
            passed=audit_result["passed"],
            failed=audit_result["failed"],
            recommendations=audit_result["recommendations"],
            created_at=datetime.utcnow()
        )

        result = await AuditReportRepository.create(
            report_doc.model_dump()
        )

        return str(result.inserted_id)

    @staticmethod
    async def get_report(
        report_id: str
    ):

        return await AuditReportRepository.get_by_id(
            report_id
        )

    @staticmethod
    async def get_all_reports():

        return await AuditReportRepository.get_all()

    @staticmethod
    async def get_device_reports(
        device_id: str
    ):

        return await AuditReportRepository.get_by_device_id(
            device_id
        )

    @staticmethod
    async def delete_report(
        report_id: str
    ):

        await AuditReportRepository.delete(
            report_id
        )