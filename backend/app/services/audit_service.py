from app.services.template_service import TemplateService
from app.services.template_parser import parse_template_content
from app.services.config_parser import parse_config_content
from app.services.compliance_engine import run_compliance_audit
from app.services.recommendation_engine import build_recommendations


class AuditService:

    @staticmethod
    async def audit_device(device: dict,audit_mode: str = "full",selected_sections: list[str] | None = None):

        template = await TemplateService.find_template(
            vendor=device["vendor"],
            device_type=device["device_type"]
        )

        if not template:
            raise ValueError(
                f"No template found for {device['device_type']}"
            )

        parsed_template = parse_template_content(
            template["template_content"]
        )

        parsed_config = parse_config_content(
            device["configuration"]
        )

        if selected_sections:
            parsed_template.controls = [
                control
                for control in parsed_template.controls
                if control.category in selected_sections
            ]

            parsed_template.sections = {
                category: controls
                for category, controls in parsed_template.sections.items()
                if category in selected_sections
            }

        compliance = run_compliance_audit(
            template=parsed_template,
            config=parsed_config,
            audit_mode=audit_mode
        )

        recommendations = build_recommendations(
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
                for r in compliance.failed
            ],
            "recommendations": [
                r.model_dump()
                for r in recommendations
            ]
        }