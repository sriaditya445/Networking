import os
import re

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


def parse_config_and_segregate(content: str, filename: str) -> tuple[str, str, dict]:
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

    # 3. Extract Interfaces
    interfaces = INTERFACE_REGEX.findall(content)

    # 4. Extract IP Addresses
    ips = []

    for match in IP_REGEX.finditer(content):
        ips.append(
            f"Interface IP: {match.group(1)} Mask: {match.group(2)}"
        )

    # 5. Extract VLANs
    vlans = sorted(
        list(set(VLAN_REGEX.findall(content)))
    )

    # 6. Routing Protocols
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
            protocols.append(
                f"Static Route ({len(static_routes)} configured)"
            )
        else:
            protocols.append("Static Route")

    # 7. Build Response
    parsed_data = {
        "interfaces": interfaces[:15],
        "interfaces_count": len(interfaces),
        "ips": ips,
        "vlans": vlans,
        "protocols": protocols
    }

    return hostname, device_type, parsed_data