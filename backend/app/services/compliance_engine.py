"""Compare template controls against device configuration controls."""

from dataclasses import dataclass, field

from app.schemas.common_schema import AuditCategory, RuleResult
from app.services.config_parser import ParsedConfig, config_has_control
from app.services.template_parser import ParsedTemplate


@dataclass
class ComplianceResult:
    overall_score: float = 0.0
    category_scores: dict[str, float] = field(default_factory=dict)
    passed: list[RuleResult] = field(default_factory=list)
    failed: list[RuleResult] = field(default_factory=list)
    total_rules: int = 0
    pass_count: int = 0


def _calculate_score(passed: int, total: int) -> float:
    if total == 0:
        return 100.0
    return round((passed / total) * 100, 2)


def run_compliance_audit(
    template: ParsedTemplate,
    config: ParsedConfig,
    sections_to_audit: list[str]
) -> ComplianceResult:

    """Compare template controls against config and produce PASS/FAIL results."""

    categories = sections_to_audit
    result = ComplianceResult()
    category_stats: dict[str, dict[str, int]] = {}

    for control in template.controls:
        if control.category not in categories:
            continue

        result.total_rules += 1
        if control.category not in category_stats:
            category_stats[control.category] = {"pass": 0, "total": 0}
        category_stats[control.category]["total"] += 1

        found = config_has_control(config.controls, control.normalized)

        rule_result = RuleResult(
            rule=control.rule,
            category=control.category,
            status="PASS" if found else "FAIL",
        )

        if found:
            result.pass_count += 1
            category_stats[control.category]["pass"] += 1
            result.passed.append(rule_result)
        else:
            result.failed.append(rule_result)

    result.overall_score = _calculate_score(result.pass_count, result.total_rules)

    for category, stats in category_stats.items():
        result.category_scores[category] = _calculate_score(stats["pass"], stats["total"])

    return result
