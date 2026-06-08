"""
Comparison Engine

Performs recursive JSON tree comparison between device configuration JSON
and template JSON to determine compliance score and findings.

Instead of line-by-line regex matching, this compares actual configuration
structure against expected template structure.

Algorithm:
1. Compare each key in template against device config
2. If template value is {{PLACEHOLDER}}, accept any device value
3. If template value is dict, recurse into children
4. If device is missing key, mark as MISSING
5. If device has extra keys, mark as EXTRA
6. Calculate compliance score based on findings

Score Calculation:
    compliant_count / (compliant_count + missing_count) * 100
"""

from typing import Dict, Any, List, Optional
import re


class ComparisonEngine:
    """
    Performs recursive JSON tree comparison between device config and template.
    """

    PLACEHOLDER_REGEX = re.compile(r'^\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}$')

    @staticmethod
    def compare(
        device_json: Dict[str, Any],
        template_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compare device configuration against template.

        Args:
            device_json: Parsed device configuration (hierarchical JSON)
            template_json: Parsed template (hierarchical JSON with placeholders)

        Returns:
            {
                "score": float (0-100),
                "summary": {
                    "compliant": int,
                    "missing": int,
                    "non_compliant": int,
                    "extra": int
                },
                "findings": [
                    {
                        "path": str,
                        "status": "COMPLIANT" | "MISSING" | "NON_COMPLIANT" | "EXTRA",
                        "expected": Any,
                        "actual": Any (optional)
                    }
                ]
            }
        """
        findings = []
        summary = {
            "compliant": 0,
            "missing": 0,
            "non_compliant": 0,
            "extra": 0
        }

        device_json = device_json or {}
        template_json = template_json or {}

        # Compare template requirements against device config
        ComparisonEngine._compare_template_keys(
            device_json,
            template_json,
            "",  # root path
            findings,
            summary
        )

        # Find extra keys in device not in template
        ComparisonEngine._find_extra_keys(
            device_json,
            template_json,
            "",  # root path
            findings,
            summary
        )

        # Calculate score
        total_required = summary["compliant"] + summary["missing"]
        if total_required > 0:
            score = (summary["compliant"] / total_required) * 100
        else:
            score = 100.0 if summary["extra"] == 0 else 0.0

        return {
            "score": round(score, 2),
            "summary": summary,
            "findings": findings
        }

    @staticmethod
    def _compare_template_keys(
        device_json: Dict[str, Any],
        template_json: Dict[str, Any],
        path: str,
        findings: List[Dict],
        summary: Dict[str, int]
    ) -> None:
        """
        Recursively compare template keys against device config.
        """
        for template_key, template_value in template_json.items():
            current_path = f"{path}.{template_key}" if path else template_key

            if template_key not in device_json:
                # Required key is missing
                findings.append({
                    "path": current_path,
                    "status": "MISSING",
                    "expected": template_value,
                    "actual": None
                })
                summary["missing"] += 1
                continue

            device_value = device_json[template_key]

            # Compare the values
            is_compliant = ComparisonEngine._compare_values(
                device_value,
                template_value,
                current_path,
                findings,
                summary
            )

            if is_compliant:
                findings.append({
                    "path": current_path,
                    "status": "COMPLIANT",
                    "expected": ComparisonEngine._sanitize_for_output(template_value),
                    "actual": ComparisonEngine._sanitize_for_output(device_value)
                })
                summary["compliant"] += 1

    @staticmethod
    def _compare_values(
        device_value: Any,
        template_value: Any,
        path: str,
        findings: List[Dict],
        summary: Dict[str, int]
    ) -> bool:
        """
        Compare a single value from device against template.

        Returns:
            True if compliant, False if non-compliant
        """
        # Check if template is a placeholder
        if isinstance(template_value, str) and ComparisonEngine._is_placeholder(template_value):
            # Placeholder matches any non-null device value
            if device_value is not None and device_value != "":
                return True
            else:
                findings.append({
                    "path": path,
                    "status": "MISSING",
                    "expected": template_value,
                    "actual": device_value
                })
                summary["missing"] += 1
                return False

        # If template is a dict, recurse into children
        if isinstance(template_value, dict) and isinstance(device_value, dict):
            ComparisonEngine._compare_template_keys(
                device_value,
                template_value,
                path,
                findings,
                summary
            )
            return True

        # If template is a dict but device is not, it's non-compliant
        if isinstance(template_value, dict) and not isinstance(device_value, dict):
            findings.append({
                "path": path,
                "status": "NON_COMPLIANT",
                "expected": template_value,
                "actual": device_value
            })
            summary["non_compliant"] += 1
            return False

        # Direct value comparison (case-insensitive for strings)
        if isinstance(template_value, str) and isinstance(device_value, str):
            if template_value.lower() == device_value.lower():
                return True
            else:
                findings.append({
                    "path": path,
                    "status": "NON_COMPLIANT",
                    "expected": template_value,
                    "actual": device_value
                })
                summary["non_compliant"] += 1
                return False

        # Numeric comparison
        if isinstance(template_value, (int, float)) and isinstance(device_value, (int, float)):
            if template_value == device_value:
                return True
            else:
                findings.append({
                    "path": path,
                    "status": "NON_COMPLIANT",
                    "expected": template_value,
                    "actual": device_value
                })
                summary["non_compliant"] += 1
                return False

        # Type mismatch
        findings.append({
            "path": path,
            "status": "NON_COMPLIANT",
            "expected": template_value,
            "actual": device_value
        })
        summary["non_compliant"] += 1
        return False

    @staticmethod
    def _find_extra_keys(
        device_json: Dict[str, Any],
        template_json: Dict[str, Any],
        path: str,
        findings: List[Dict],
        summary: Dict[str, int]
    ) -> None:
        """
        Find keys in device that are not in template (extra configuration).
        """
        for device_key, device_value in device_json.items():
            current_path = f"{path}.{device_key}" if path else device_key

            if device_key not in template_json:
                # Extra configuration found
                findings.append({
                    "path": current_path,
                    "status": "EXTRA",
                    "expected": None,
                    "actual": ComparisonEngine._sanitize_for_output(device_value)
                })
                summary["extra"] += 1
                continue

            # If both are dicts, recurse to find nested extras
            if isinstance(device_value, dict) and isinstance(template_json[device_key], dict):
                ComparisonEngine._find_extra_keys(
                    device_value,
                    template_json[device_key],
                    current_path,
                    findings,
                    summary
                )

    @staticmethod
    def _is_placeholder(value: str) -> bool:
        """
        Check if a string value is a template placeholder.
        """
        return bool(ComparisonEngine.PLACEHOLDER_REGEX.match(value))

    @staticmethod
    def _sanitize_for_output(value: Any) -> Any:
        """
        Prepare a value for JSON output in findings.
        
        Converts dicts to simplified representations for readability.
        """
        if isinstance(value, dict):
            # For complex objects, just show the keys
            if len(value) > 3:
                return f"{{keys: {list(value.keys())[:3]}...}}"
            return value
        return value


def compare_configs(
    device_json: Dict[str, Any],
    template_json: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Convenience function to compare device and template JSON.
    """
    engine = ComparisonEngine()
    return engine.compare(device_json, template_json)
