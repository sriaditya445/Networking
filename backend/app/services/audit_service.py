"""
Audit Service

Orchestrates audit operations:
1. Loads template from file
2. Parses template to JSON (with placeholders)
3. Loads device configuration JSON
4. Compares using ComparisonEngine
5. Returns audit results

This service bridges the gap between workers and the comparison engine.
"""

import os
from typing import Dict, Any, Optional
from app.core.database import logger
from app.parsers.common.template_parser import TemplateParser
from app.services.comparison_engine import ComparisonEngine


class AuditService:
    """
    Orchestrates configuration auditing against golden templates.
    """

    # Base directory for templates
    TEMPLATES_DIR = None

    @staticmethod
    def _get_templates_dir() -> str:
        """
        Get the templates directory path.
        """
        if AuditService.TEMPLATES_DIR:
            return AuditService.TEMPLATES_DIR

        # Compute relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        templates_dir = os.path.join(os.path.dirname(current_dir), "templates")
        return templates_dir

    @staticmethod
    async def audit_device(
        device_id: str,
        configuration_json: Dict[str, Any],
        device_type: str
    ) -> Dict[str, Any]:
        """
        Audit a device configuration against its template.

        Args:
            device_id: Device identifier (for logging)
            configuration_json: Device config as hierarchical JSON
            device_type: Device type (switch, router, firewall, wlc)

        Returns:
            {
                "score": float,
                "summary": {...},
                "findings": [...]
            }
        """
        try:
            # Load template
            template_json = AuditService._load_template(device_type)

            if not template_json:
                logger.warning(f"No template found for device type: {device_type}")
                return {
                    "score": 0.0,
                    "summary": {
                        "compliant": 0,
                        "missing": 0,
                        "non_compliant": 0,
                        "extra": 0
                    },
                    "findings": [
                        {
                            "path": "template",
                            "status": "ERROR",
                            "expected": None,
                            "actual": f"No template found for {device_type}"
                        }
                    ]
                }

            # Run comparison
            audit_result = ComparisonEngine.compare(
                device_json=configuration_json or {},
                template_json=template_json
            )

            logger.info(f"Audit completed for {device_id}: score={audit_result['score']}")
            return audit_result

        except Exception as e:
            logger.error(f"Audit error for device {device_id}: {str(e)}")
            return {
                "score": 0.0,
                "summary": {
                    "compliant": 0,
                    "missing": 0,
                    "non_compliant": 0,
                    "extra": 0
                },
                "findings": [
                    {
                        "path": "audit",
                        "status": "ERROR",
                        "expected": None,
                        "actual": str(e)
                    }
                ]
            }

    @staticmethod
    def _load_template(device_type: str) -> Optional[Dict[str, Any]]:
        """
        Load and parse golden template for device type.

        Args:
            device_type: Device type (switch, router, firewall, wlc)

        Returns:
            Parsed template JSON with placeholders, or None if not found
        """
        try:
            # Map device type to template file
            template_filename = f"{device_type.lower()}_golden_template.txt"

            # Fallback to switch if type unknown
            templates_dir = AuditService._get_templates_dir()
            template_path = os.path.join(templates_dir, template_filename)

            if not os.path.exists(template_path):
                logger.warning(f"Template file not found: {template_path}")
                # Try switch as fallback
                fallback_path = os.path.join(templates_dir, "switch_golden_template.txt")
                if not os.path.exists(fallback_path):
                    return None
                template_path = fallback_path

            # Read template file
            with open(template_path, 'r', encoding='utf-8', errors='ignore') as f:
                template_text = f.read()

            # Parse template to JSON
            template_json = TemplateParser.parse_template(template_text)

            logger.debug(f"Loaded template: {template_path}")
            return template_json

        except Exception as e:
            logger.error(f"Error loading template for {device_type}: {str(e)}")
            return None

    @staticmethod
    def get_template_placeholders(device_type: str) -> set:
        """
        Get placeholder names used in a template.

        Args:
            device_type: Device type

        Returns:
            Set of placeholder names
        """
        template_json = AuditService._load_template(device_type)
        if not template_json:
            return set()

        return TemplateParser.extract_placeholders(template_json)

    @staticmethod
    def validate_device_json(device_json: Dict[str, Any]) -> tuple:
        """
        Validate device JSON structure.

        Returns:
            (is_valid, error_message)
        """
        if not isinstance(device_json, dict):
            return False, "Device configuration must be a dictionary"

        return True, None

    @staticmethod
    def simulate_audit(device_id: str, configuration_json: Dict[str, Any], device_type: str) -> Dict[str, Any]:
        """
        Produce a deterministic simulated audit result for testing and staging.

        Deterministic rule: use the last hex char of the device_id string; even -> PASS, odd -> FAIL.
        """
        try:
            last_char = str(device_id)[-1]
            parity = int(last_char, 16) % 2
        except Exception:
            parity = 0

        # PASS when parity == 0
        passed = parity == 0

        if passed:
            score = 100.0
            summary = {"compliant": 1, "missing": 0, "non_compliant": 0, "extra": 0}
            findings = []
        else:
            score = 42.0
            summary = {"compliant": 0, "missing": 1, "non_compliant": 1, "extra": 0}
            findings = [
                {
                    "path": "interfaces.Gi0/1.description",
                    "status": "NON_COMPLIANT",
                    "expected": "{{DESCRIPTION}}",
                    "actual": "missing or incorrect",
                    "recommendation": "Set interface description to match template"
                }
            ]

        return {
            "score": score,
            "summary": summary,
            "findings": findings
        }
