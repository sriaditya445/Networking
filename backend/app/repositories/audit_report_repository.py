from bson import ObjectId

# from app.core.database import audit_reports_collection
from app.core.database import get_db

class AuditReportRepository:
    @staticmethod
    def collection():
        return get_db().audit_reports

    @staticmethod
    async def create(data: dict):

        return await AuditReportRepository.collection().insert_one(
            data
        )

    @staticmethod
    async def get_by_id(report_id: str):

        report = await AuditReportRepository.collection().find_one(
            {
                "_id": ObjectId(report_id)
            }
        )

        if report:
            report["_id"] = str(report["_id"])

        return report

    @staticmethod
    async def get_all():

        reports = await AuditReportRepository.collection().find(
            {}
        ).sort(
            "created_at",
            -1
        ).to_list(500)

        for report in reports:
            report["_id"] = str(report["_id"])

        return reports

    @staticmethod
    async def get_by_device_id(
        device_id: str
    ):

        reports = await AuditReportRepository.collection().find(
            {
                "device_id": device_id
            }
        ).to_list(100)

        for report in reports:
            report["_id"] = str(report["_id"])

        return reports

    @staticmethod
    async def delete(report_id: str):

        return await AuditReportRepository.collection().delete_one(
            {
                "_id": ObjectId(report_id)
            }
        )