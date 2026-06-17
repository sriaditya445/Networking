import os,re
from app.core.database import logger
# Regular expression templates for configuration analysis and segregation
HOSTNAME_REGEX = re.compile(
    r"^\s*hostname\s+([a-zA-Z0-9-_]+)",
    re.IGNORECASE | re.MULTILINE
)

INTERFACE_REGEX = re.compile(
    r"^\s*interface\s+(\S+)",
    re.IGNORECASE | re.MULTILINE
)

IP_REGEX = re.compile(
    r"^\s*ip address\s+([0-9.]+)\s+([0-9.]+)",
    re.IGNORECASE | re.MULTILINE
)

VLAN_REGEX = re.compile(
    r"switchport access vlan\s+(\d+)",
    re.IGNORECASE
)

STATIC_ROUTE_REGEX = re.compile(
    r"^\s*ip route\s+([0-9.]+)\s+([0-9.]+)\s+(\S+)",
    re.IGNORECASE | re.MULTILINE
)


def parse_device_config(content: str, filename: str) -> tuple[str, str, dict]:
    """
    Parse network configuration and identify device type.
    """

    # 1. Extract Hostname
    match = HOSTNAME_REGEX.search(content)

    if match:
        hostname = match.group(1)
    else:
        hostname = os.path.splitext(filename)[0]

    # 2. Identify Device Type
    content_lower = content.lower()

    # WLC
    if any(keyword in content_lower for keyword in [
        "c9800",
        "wireless-local-exporter",
        "wireless-avc",
        "wlan",
        "policy profile",
        "ap join profile",
        "wireless tag policy"
    ]):
        device_type = "WLC"

    # Layer 3 Switch
    elif (
        "ip routing" in content_lower
        and "switchport" in content_lower
    ):
        device_type = "L3 Switch"

    # Layer 2 Switch
    elif any(keyword in content_lower for keyword in [
        "switchport",
        "spanning-tree",
        "switch 1 provision",
        "storm-control"
    ]):
        device_type = "L2 Switch"

    # Router
    elif any(keyword in content_lower for keyword in [
        "router ospf",
        "router bgp",
        "router eigrp",
        "router rip"
    ]):
        device_type = "Router"

    # Firewall
    elif any(keyword in content_lower for keyword in [
        "security-level",
        "access-group",
        "object network",
        "asa version"
    ]):
        device_type = "Firewall"

    # Access Point
    elif any(keyword in content_lower for keyword in [
        "dot11radio",
        "ssid",
        "station-role",
        "ap name"
    ]):
        device_type = "Access Point"

    else:
        device_type = "Unknown"

    return {
        "device_name": hostname,
        "device_type": device_type,
        "configuration_json": {},
        "audit_summary": {}
    }