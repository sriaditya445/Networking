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
        audit_result_id: str
    ):

        report_doc = AuditReportModel(
            device_id=str(device["_id"]),
            audit_result_id=audit_result_id,
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