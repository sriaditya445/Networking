"""MongoDB data access layer for audit platform."""

from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.common import AuditReportResponse, GoldenTemplateCreate, RuleResult


def _serialize_doc(doc: dict | None) -> dict | None:
    if not doc:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


class MongoDBService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def save_device_config(
        self,
        device_name: str,
        device_type: str,
        vendor: str,
        file_path: str,
        config_content: str,
        upload_batch_id: str,
    ) -> str:
        doc = {
            "device_name": device_name,
            "device_type": device_type,
            "vendor": vendor,
            "file_path": file_path,
            "config_content": config_content,
            "upload_batch_id": upload_batch_id,
            "detected_at": datetime.now(timezone.utc),
        }
        result = await self.db.device_configs.insert_one(doc)
        return str(result.inserted_id)

    async def get_device_config(self, config_id: str) -> dict | None:
        from bson import ObjectId

        doc = await self.db.device_configs.find_one({"_id": ObjectId(config_id)})
        return _serialize_doc(doc)

    async def list_device_configs(self, limit: int = 100) -> list[dict]:
        cursor = self.db.device_configs.find().sort("detected_at", -1).limit(limit)
        return [_serialize_doc(doc) async for doc in cursor]

    async def create_template(self, template: GoldenTemplateCreate) -> str:
        now = datetime.now(timezone.utc)
        doc = template.model_dump()
        doc["created_at"] = now
        doc["updated_at"] = now
        result = await self.db.golden_templates.insert_one(doc)
        return str(result.inserted_id)

    async def update_template(self, template_id: str, data: dict) -> bool:
        from bson import ObjectId

        data["updated_at"] = datetime.now(timezone.utc)
        result = await self.db.golden_templates.update_one(
            {"_id": ObjectId(template_id)}, {"$set": data}
        )
        return result.modified_count > 0

    async def delete_template(self, template_id: str) -> bool:
        from bson import ObjectId

        result = await self.db.golden_templates.delete_one({"_id": ObjectId(template_id)})
        return result.deleted_count > 0

    async def save_audit_result(
        self,
        device_name: str,
        device_type: str,
        vendor: str,
        audit_mode: str,
        overall_score: float,
        category_scores: dict[str, float],
        passed: list[RuleResult],
        failed: list[RuleResult],
        config_id: str,
        template_id: str,
    ) -> str:
        doc = {
            "device_name": device_name,
            "device_type": device_type,
            "vendor": vendor,
            "audit_mode": audit_mode,
            "overall_score": overall_score,
            "category_scores": category_scores,
            "passed": [r.model_dump() for r in passed],
            "failed": [r.model_dump() for r in failed],
            "config_id": config_id,
            "template_id": template_id,
            "created_at": datetime.now(timezone.utc),
        }
        result = await self.db.audit_results.insert_one(doc)
        return str(result.inserted_id)

    async def save_audit_report(
        self,
        device_name: str,
        device_type: str,
        vendor: str,
        audit_mode: str,
        overall_score: float,
        category_scores: dict[str, float],
        passed: list[RuleResult],
        failed: list[RuleResult],
        recommendations: list[RuleResult],
        audit_result_id: str,
    ) -> str:
        doc = {
            "device_name": device_name,
            "device_type": device_type,
            "vendor": vendor,
            "audit_mode": audit_mode,
            "overall_score": overall_score,
            "category_scores": category_scores,
            "passed": [r.model_dump() for r in passed],
            "failed": [r.model_dump() for r in failed],
            "recommendations": [r.model_dump() for r in recommendations],
            "audit_result_id": audit_result_id,
            "created_at": datetime.now(timezone.utc),
        }
        result = await self.db.audit_reports.insert_one(doc)
        await self._update_compliance_trend(overall_score)
        return str(result.inserted_id)

    async def _update_compliance_trend(self, score: float) -> None:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        existing = await self.db.compliance_trends.find_one({"date": today})
        if existing:
            count = existing.get("device_count", 0) + 1
            avg = ((existing.get("overall_score", 0) * existing.get("device_count", 0)) + score) / count
            await self.db.compliance_trends.update_one(
                {"date": today},
                {"$set": {"overall_score": round(avg, 2), "device_count": count}},
            )
        else:
            await self.db.compliance_trends.insert_one(
                {"date": today, "overall_score": score, "device_count": 1}
            )

    async def save_recommendations(
        self, report_id: str, recommendations: list[RuleResult]
    ) -> None:
        docs = [
            {
                "report_id": report_id,
                **r.model_dump(),
                "created_at": datetime.now(timezone.utc),
            }
            for r in recommendations
        ]
        if docs:
            await self.db.recommendations.insert_many(docs)

    async def get_audit_report(self, report_id: str) -> dict | None:
        from bson import ObjectId

        doc = await self.db.audit_reports.find_one({"_id": ObjectId(report_id)})
        return _serialize_doc(doc)

    async def list_audit_reports(self, limit: int = 50) -> list[dict]:
        cursor = self.db.audit_reports.find().sort("created_at", -1).limit(limit)
        return [_serialize_doc(doc) async for doc in cursor]

    async def get_compliance_trends(self, days: int = 30) -> list[dict]:
        cursor = self.db.compliance_trends.find().sort("date", -1).limit(days)
        return [doc async for doc in cursor]

    async def get_dashboard_stats(self) -> dict[str, Any]:
        total_devices = await self.db.device_configs.count_documents({})
        total_audits = await self.db.audit_reports.count_documents({})
        total_templates = await self.db.golden_templates.count_documents({})

        pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$overall_score"}}}]
        avg_result = await self.db.audit_reports.aggregate(pipeline).to_list(1)
        average_compliance = round(avg_result[0]["avg"], 2) if avg_result else 0.0

        recent = await self.list_audit_reports(limit=10)
        trends = await self.get_compliance_trends(30)

        inventory_pipeline = [
            {"$group": {"_id": {"device_type": "$device_type", "vendor": "$vendor"}, "count": {"$sum": 1}}}
        ]
        inventory_raw = await self.db.device_configs.aggregate(inventory_pipeline).to_list(100)
        device_inventory = [
            {"device_type": i["_id"]["device_type"], "vendor": i["_id"]["vendor"], "count": i["count"]}
            for i in inventory_raw
        ]

        return {
            "total_devices": total_devices,
            "total_audits": total_audits,
            "average_compliance": average_compliance,
            "total_templates": total_templates,
            "recent_reports": recent,
            "compliance_trends": list(reversed(trends)),
            "device_inventory": device_inventory,
        }
