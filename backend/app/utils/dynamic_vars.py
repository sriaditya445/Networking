"""Normalize config lines by stripping dynamic values for comparison."""

import re

# Patterns where the value portion should be ignored during control matching
DYNAMIC_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^hostname\s+.+$", re.I), "hostname {{hostname}}"),
    (re.compile(r"^ip\s+domain\s+name\s+.+$", re.I), "ip domain-name {{domain_name}}"),
    (re.compile(r"^ip\s+name-server\s+.+$", re.I), "ip name-server {{dns_servers}}"),
    (re.compile(r"^ntp\s+server\s+.+$", re.I), "ntp server {{ntp_servers}}"),
    (re.compile(r"^snmp-server\s+community\s+.+$", re.I), "snmp-server community {{snmp_community}}"),
    (re.compile(r"^snmp-server\s+user\s+.+$", re.I), "snmp-server user {{snmp_user}}"),
    (re.compile(r"^snmp-server\s+host\s+.+$", re.I), "snmp-server host {{snmp_host}}"),
    (re.compile(r"^logging\s+host\s+.+$", re.I), "logging host {{syslog_servers}}"),
    (re.compile(r"^logging\s+\d+\.\d+\.\d+\.\d+", re.I), "logging {{syslog_servers}}"),
    (re.compile(r"^description\s+.+$", re.I), "description {{description}}"),
    (re.compile(r"^interface\s+(Vlan|vlan)\d+", re.I), "interface Vlan{{vlan_id}}"),
    (re.compile(r"^vlan\s+\d+", re.I), "vlan {{vlan_id}}"),
    (re.compile(r"^wlan\s+\d+\s+.+$", re.I), "wlan {{wlan_id}} {{ssid}}"),
    (re.compile(r"^\s+ssid\s+.+$", re.I), " ssid {{ssid}}"),
    (re.compile(r"^ip\s+address\s+.+$", re.I), "ip address {{ip_address}}"),
    (re.compile(r"^ip\s+route\s+.+$", re.I), "ip route {{static_route}}"),
    (re.compile(r"^router\s+ospf\s+\d+", re.I), "router ospf {{ospf_process}}"),
    (re.compile(r"^router\s+bgp\s+\d+", re.I), "router bgp {{bgp_asn}}"),
    (re.compile(r"^interface\s+(GigabitEthernet|TenGigabitEthernet|FastEthernet|Ethernet)\d+/\d+", re.I),
     "interface {{interface}}"),
    (re.compile(r"^interface\s+Port-channel\d+", re.I), "interface Port-channel{{port_channel}}"),
    (re.compile(r"^interface\s+Loopback\d+", re.I), "interface Loopback{{loopback}}"),
    (re.compile(r"^interface\s+Management\d+", re.I), "interface Management{{mgmt}}"),
    (re.compile(r"^banner\s+\w+\s+.+$", re.I), "banner {{banner}}"),
    (re.compile(r"^enable\s+secret\s+.+$", re.I), "enable secret {{secret}}"),
    (re.compile(r"^username\s+\S+\s+.+$", re.I), "username {{username}} {{password}}"),
    (re.compile(r"^radius\s+server\s+\S+", re.I), "radius server {{radius_server}}"),
    (re.compile(r"^tacacs\s+server\s+\S+", re.I), "tacacs server {{tacacs_server}}"),
    (re.compile(r"^aaa\s+authentication\s+login\s+\S+\s+.+$", re.I), "aaa authentication login {{list}} {{method}}"),
]

JINJA_PLACEHOLDER = re.compile(r"\{\{[^}]+\}\}")


def normalize_line(line: str) -> str:
    """Strip dynamic values from a config line for control comparison."""
    stripped = line.strip()
    if not stripped or stripped.startswith("!"):
        return ""

    for pattern, replacement in DYNAMIC_PATTERNS:
        if pattern.match(stripped):
            return replacement.lower()

    normalized = JINJA_PLACEHOLDER.sub("{{dynamic}}", stripped)
    return normalized.lower()


def normalize_control(control: str) -> str:
    """Normalize a golden template control for comparison."""
    return normalize_line(control) or control.strip().lower()


def controls_match(template_control: str, config_line: str) -> bool:
    """Check if a config line satisfies a template control."""
    norm_template = normalize_control(template_control)
    norm_config = normalize_line(config_line)

    if not norm_config:
        return False

    if norm_template == norm_config:
        return True

    # Partial match for multi-token controls
    template_tokens = set(norm_template.split())
    config_tokens = set(norm_config.split())
    if len(template_tokens) >= 2 and template_tokens.issubset(config_tokens):
        return True

    return False
