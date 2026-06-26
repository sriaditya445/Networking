from app.services.template_service import TemplateService
from app.services.template_parser import parse_template_content
from app.services.config_parser import parse_config_content
from app.services.compliance_engine import run_compliance_audit
from app.services.recommendation_engine import build_recommendations
import os

class AuditService:

    @staticmethod
    async def audit_device(device: dict,audit_mode: str = "full",selected_sections: list[str] | None = None):

        template = await TemplateService.get_template(
            device["template_id"]
        )

        if not template:
            raise ValueError(
                f"No template found for {device['device_type']}"
            )

        parsed_template = parse_template_content(
            template["template_content"]
        )

        file_path = device.get("file_path")

        if not file_path or not os.path.exists(file_path):
            raise ValueError(
                f"Configuration file not found for {device['device_name']}"
            )

        with open(file_path,"r",encoding="utf-8",errors="ignore") as f:
            config_content = f.read()

        parsed_config = parse_config_content(
            config_content
        )
        compliance = run_compliance_audit(
            template=parsed_template,
            config=parsed_config,
            sections_to_audit=selected_sections
        )

        enriched_failed = build_recommendations(
            compliance.failed
        )

        return {
            "audit_mode": audit_mode,
            "selected_sections": selected_sections or [],
            "score": compliance.overall_score,
            "category_scores": compliance.category_scores,
            "passed": [
                r.model_dump()
                for r in compliance.passed
            ],
            "failed": [
                r.model_dump()
                for r in enriched_failed
            ]
        }