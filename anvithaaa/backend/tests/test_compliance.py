"""Integration tests for compliance engine."""

from app.services.compliance_engine import run_compliance_audit
from app.services.config_parser import parse_config_content
from app.services.template_parser import parse_template_content

SAMPLE_TEMPLATE = """
! SYSTEM
aaa new-model
service password-encryption
dot1x system-auth-control
"""

SAMPLE_CONFIG_PASS_PARTIAL = """
aaa new-model
dot1x system-auth-control
"""


def test_compliance_partial_pass():
    template = parse_template_content(SAMPLE_TEMPLATE)
    config = parse_config_content(SAMPLE_CONFIG_PASS_PARTIAL)
    result = run_compliance_audit(template, config, "full")

    assert result.total_rules == 3
    assert result.pass_count == 2
    passed_rules = [r.rule for r in result.passed]
    failed_rules = [r.rule for r in result.failed]

    assert "aaa new-model" in passed_rules
    assert "dot1x system-auth-control" in passed_rules
    assert "service password-encryption" in failed_rules


def test_dynamic_hostname_ignored():
    template = parse_template_content("hostname {{ hostname }}\n")
    config = parse_config_content("hostname MY-SWITCH-01\n")
    result = run_compliance_audit(template, config, "full")
    assert result.pass_count == 1


def test_section_audit_aaa_only():
    template = parse_template_content("""
! AAA
aaa new-model
service password-encryption
! SECURITY
dot1x system-auth-control
""")
    config = parse_config_content("aaa new-model\n")
    result = run_compliance_audit(template, config, "aaa")
    assert result.total_rules == 2
    assert result.pass_count == 1
