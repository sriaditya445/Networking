"""Parse golden templates and extract categorized controls."""

import re
from dataclasses import dataclass, field

from jinja2 import Environment, BaseLoader

from app.utils.dynamic_vars import normalize_control

SECTION_HEADERS = {
    "system": "aaa",
    "aaa": "aaa",
    "security": "security",
    "dns": "dns",
    "ntp": "ntp",
    "snmp": "snmp",
    "logging": "logging",
    "layer2": "layer2",
    "layer3": "layer3",
    "interfaces": "interfaces",
    "port channels": "interfaces",
    "port channel": "interfaces",
    "ospf": "layer3",
    "bgp": "layer3",
    "static routes": "layer3",
    "wireless": "wireless",
    "wlan": "wireless",
    "rf": "wireless",
    "avc": "performance",
    "webauth": "security",
    "radius": "aaa",
    "tacacs": "aaa",
    "high availability": "high_availability",
    "performance": "performance",
}


@dataclass
class ParsedControl:
    rule: str
    category: str
    normalized: str = ""


@dataclass
class ParsedTemplate:
    controls: list[ParsedControl] = field(default_factory=list)
    sections: dict[str, list[str]] = field(default_factory=dict)


def _resolve_category(header: str) -> str:
    key = header.strip().lower()
    return SECTION_HEADERS.get(key, "security")


def parse_template_content(template_content: str) -> ParsedTemplate:
    """Extract controls from Jinja2 template, grouped by section."""
    result = ParsedTemplate()
    current_category = "security"

    lines = template_content.splitlines()
    for line in lines:
        stripped = line.strip()

        lines = template_content.splitlines()

    for i, line in enumerate(lines):

        stripped = line.strip()

        if (
            stripped.startswith("!")
            and "=" in stripped
            and i + 1 < len(lines)
            and i + 2 < len(lines)
        ):
            middle = lines[i + 1].strip()

            if middle.startswith("!"):
                header = middle.lstrip("!").strip()

                if header:
                    current_category = _resolve_category(
                        header
                    )

            continue

        header_match = re.match(r"^!\s*(SYSTEM|AAA|SECURITY|DNS|NTP|SNMP|LOGGING|OSPF|BGP|STATIC ROUTES|INTERFACES|HIGH AVAILABILITY|WIRELESS|WLAN|RF|AVC|WEBAUTH)\s*$", stripped, re.I)
        if header_match:
            current_category = _resolve_category(header_match.group(1))
            continue

        if not stripped or stripped.startswith("!"):
            continue

        if stripped.startswith("{{") and stripped.endswith("}}"):
            continue

        control = ParsedControl(
            rule=stripped,
            category=current_category,
            normalized=normalize_control(stripped),
        )
        result.controls.append(control)

        if current_category not in result.sections:
            result.sections[current_category] = []
        result.sections[current_category].append(stripped)

    return result


def render_template_preview(template_content: str, variables: dict | None = None) -> str:
    """Render Jinja2 template with sample variables for preview."""
    env = Environment(loader=BaseLoader(), keep_trailing_newline=True)
    defaults = {
        "hostname": "DEVICE-01",
        "domain_name": "example.com",
        "dns_servers": "10.0.0.1",
        "ntp_servers": "10.0.0.2",
        "snmp_group": "SNMP-GROUP",
        "syslog_servers": "10.0.0.3",
        "wlans": [],
    }
    if variables:
        defaults.update(variables)
    template = env.from_string(template_content)
    return template.render(**defaults)
