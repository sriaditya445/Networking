"""Parse uploaded device configurations and extract controls by category."""

import re
from dataclasses import dataclass, field

from app.services.template_parser import SECTION_HEADERS
from app.utils.dynamic_vars import normalize_control, normalize_line


@dataclass
class ConfigControl:
    rule: str
    category: str
    normalized: str
    line_number: int


@dataclass
class ParsedConfig:
    controls: list[ConfigControl] = field(default_factory=list)
    sections: dict[str, list[str]] = field(default_factory=dict)
    hostname: str = "unknown"


def _detect_section(line: str, current: str) -> str:
    lower = line.lower()
    if "aaa " in lower or lower.startswith("aaa"):
        return "aaa"
    if any(k in lower for k in ("password-encryption", "login block", "port-security", "dot1x")):
        return "security"
    if "snmp" in lower:
        return "snmp"
    if "ntp" in lower:
        return "ntp"
    if "name-server" in lower or "ip domain-name" in lower:
        return "dns"
    if "logging" in lower:
        return "logging"
    if any(k in lower for k in ("spanning-tree", "switchport", "vlan ", "dot1x")):
        return "layer2"
    if any(k in lower for k in ("router ospf", "router bgp", "ip route", "ip routing")):
        return "layer3"
    if any(k in lower for k in ("wlan", "wireless", "ap ", "dot11")):
        return "wireless"
    if any(k in lower for k in ("vrrp", "hsrp", "redundancy", "stack")):
        return "high_availability"
    if lower.startswith("interface"):
        return "interfaces"
    return current


def parse_config_content(config_content: str) -> ParsedConfig:
    """Extract meaningful controls from device configuration."""
    result = ParsedConfig()
    current_category = "security"
    in_interface = False

    for idx, line in enumerate(config_content.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("!"):
            continue

        hostname_match = re.match(r"^hostname\s+(\S+)", stripped, re.I)
        if hostname_match:
            result.hostname = hostname_match.group(1)

        if stripped.lower().startswith("interface "):
            in_interface = True
            current_category = "interfaces"
        elif not line.startswith(" ") and not line.startswith("\t"):
            in_interface = False
            current_category = _detect_section(stripped, current_category)

        normalized = normalize_line(stripped)
        if not normalized:
            continue

        control = ConfigControl(
            rule=stripped,
            category=current_category,
            normalized=normalized,
            line_number=idx,
        )
        result.controls.append(control)

        if current_category not in result.sections:
            result.sections[current_category] = []
        result.sections[current_category].append(stripped)

    return result


def config_has_control(config_controls: list[ConfigControl], template_normalized: str) -> bool:
    """Check if any config control matches the normalized template control."""
    for ctrl in config_controls:
        if ctrl.normalized == template_normalized:
            return True
        template_tokens = set(template_normalized.split())
        config_tokens = set(ctrl.normalized.split())
        if len(template_tokens) >= 2 and template_tokens.issubset(config_tokens):
            return True
    return False
