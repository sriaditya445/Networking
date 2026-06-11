"""Audit orchestration service."""

import uuid
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.common import AuditReportResponse, RuleResult
from app.services.compliance_engine import run_compliance_audit
from app.services.config_parser import parse_config_content
from app.services.device_detector import detect_device_type
from app.services.mongodb_service import MongoDBService
from app.services.recommendation_engine import build_recommendations
from app.services.report_generator import build_audit_report_response
from app.services.template_loader import get_parsed_template


class AuditService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.mongo = MongoDBService(db)

    async def process_upload_batch(
        self, files: list[tuple[str, bytes]], upload_dir: str
    ) -> dict:
        """Process uploaded config files: detect, store, return batch info."""
        batch_id = str(uuid.uuid4())
        batch_dir = Path(upload_dir) / batch_id
        batch_dir.mkdir(parents=True, exist_ok=True)

        processed = []
        for filename, content in files:
            text = content.decode("utf-8", errors="replace")
            device_name = Path(filename).stem
            detection = detect_device_type(text)

            file_path = str(batch_dir / Path(filename).name)
            Path(file_path).write_text(text)

            config_id = await self.mongo.save_device_config(
                device_name=device_name,
                device_type=detection.device_type,
                vendor=detection.vendor,
                file_path=file_path,
                config_content=text,
                upload_batch_id=batch_id,
            )

            processed.append({
                "config_id": config_id,
                "device_name": device_name,
                "device_type": detection.device_type,
                "vendor": detection.vendor,
                "confidence": detection.confidence,
                "filename": filename,
            })

        return {"batch_id": batch_id, "devices": processed, "count": len(processed)}

    async def run_audit(
        self,
        config_id: str,
        audit_mode: str = "full",
        template_name: str | None = None,
    ) -> AuditReportResponse:
        """Run compliance audit for a stored device config."""
        config_doc = await self.mongo.get_device_config(config_id)
        if not config_doc:
            raise ValueError(f"Config not found: {config_id}")

        template_doc, parsed_template = await get_parsed_template(
            self.db,
            config_doc["vendor"],
            config_doc["device_type"],
            template_name,
        )
        if not parsed_template or not template_doc:
            raise ValueError(
                f"No golden template for {config_doc['vendor']} {config_doc['device_type']}"
            )

        parsed_config = parse_config_content(config_doc["config_content"])
        compliance = run_compliance_audit(parsed_template, parsed_config, audit_mode)
        recommendations = build_recommendations(compliance.failed)

        audit_result_id = await self.mongo.save_audit_result(
            device_name=config_doc["device_name"],
            device_type=config_doc["device_type"],
            vendor=config_doc["vendor"],
            audit_mode=audit_mode,
            overall_score=compliance.overall_score,
            category_scores=compliance.category_scores,
            passed=compliance.passed,
            failed=compliance.failed,
            config_id=config_id,
            template_id=template_doc["id"],
        )

        report_id = await self.mongo.save_audit_report(
            device_name=config_doc["device_name"],
            device_type=config_doc["device_type"],
            vendor=config_doc["vendor"],
            audit_mode=audit_mode,
            overall_score=compliance.overall_score,
            category_scores=compliance.category_scores,
            passed=compliance.passed,
            failed=compliance.failed,
            recommendations=recommendations,
            audit_result_id=audit_result_id,
        )

        await self.mongo.save_recommendations(report_id, recommendations)

        report_doc = await self.mongo.get_audit_report(report_id)
        return build_audit_report_response(report_doc)

    async def run_batch_audit(
        self, config_ids: list[str], audit_mode: str = "full"
    ) -> list[AuditReportResponse]:
        """Run audit on multiple configs."""
        reports = []
        for config_id in config_ids:
            try:
                report = await self.run_audit(config_id, audit_mode)
                reports.append(report)
            except ValueError:
                continue
        return reports
