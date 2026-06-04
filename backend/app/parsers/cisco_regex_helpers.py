import os,re

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

    # 3. Segregate detailed sub-configuration items using Regex
    interfaces = INTERFACE_REGEX.findall(content)
    
    # Extract IP configuration tuples (IP, Netmask)
    ips = []
    for m in IP_REGEX.finditer(content):
        ips.append(f"Interface IP: {m.group(1)} Mask: {m.group(2)}")

    # Extract unique VLANs
    vlans = sorted(list(set(VLAN_REGEX.findall(content))))

    # Identify active routing protocols
    protocols = []
    if "router ospf" in content_lower:
        protocols.append("OSPF")
    if "router bgp" in content_lower:
        protocols.append("BGP")
    if "router rip" in content_lower:
        protocols.append("RIP")
    if "ip route" in content_lower:
        static_routes = STATIC_ROUTE_REGEX.findall(content)
        if static_routes:
            protocols.append(f"Static Route ({len(static_routes)} configured)")
        else:
            protocols.append("Static Route")

    # Combine into a structured dict
    parsed_data = {
        "interfaces": interfaces[:15],  # Limit list to first 15 for display
        "interfaces_count": len(interfaces),
        "ips": ips,
        "vlans": vlans,
        "protocols": protocols
    }

    return {
        "device_name": hostname,
        "device_type": device_type,
        "parsed_data": parsed_data,
        "configuration_json": configuration_json,
        "audit_summary": audit_summary
    }