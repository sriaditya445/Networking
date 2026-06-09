import os,re
from app.core.database import logger
# Regular expression templates for configuration analysis and segregation
HOSTNAME_REGEX = re.compile(r"^\s*hostname\s+([a-zA-Z0-9-_]+)", re.IGNORECASE | re.MULTILINE)
INTERFACE_REGEX = re.compile(r"^\s*interface\s+(\S+)", re.IGNORECASE | re.MULTILINE)
IP_REGEX = re.compile(r"^\s*ip address\s+([0-9.]+)\s+([0-9.]+)", re.IGNORECASE | re.MULTILINE)
VLAN_REGEX = re.compile(r"switchport access vlan\s+(\d+)", re.IGNORECASE)
STATIC_ROUTE_REGEX = re.compile(r"^\s*ip route\s+([0-9.]+)\s+([0-9.]+)\s+(\S+)", re.IGNORECASE | re.MULTILINE)

def parse_device_config(content: str, filename: str) -> tuple[str, str, dict]:
    """
    Parses configuration text using regex templates to extract the hostname,
    segregate it into a component type, and gather sub-component specifications.
    """
    # 1. Extract Hostname
    match = HOSTNAME_REGEX.search(content)
    if match:
        hostname = match.group(1)
    else:
        hostname = os.path.splitext(filename)[0]
        logger.info(f"No hostname found in {filename}, falling back to base name: {hostname}")

    # 2. Identify Device Type (Segregation Template Matching)
    content_lower = content.lower()
    if "switchport" in content_lower or "vlan" in content_lower:
        device_type = "Switch"
    elif "router ospf" in content_lower or "router bgp" in content_lower or "router rip" in content_lower:
        device_type = "Router"
    elif "firewall" in content_lower or "security-level" in content_lower or "access-group" in content_lower:
        device_type = "Firewall"
    elif "wlan" in content_lower or "ap name" in content_lower:
        device_type = "AccessPoint"
    else:
        device_type = "Unknown"

    return {
        "device_name": hostname,
        "device_type": device_type,
        "configuration_json": {},
        "audit_summary": {}
    }