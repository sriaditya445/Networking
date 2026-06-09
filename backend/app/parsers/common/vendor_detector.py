def detect_vendor(content: str):

    content_lower = content.lower()

    if "set interfaces" in content_lower:
        return "Juniper"

    if "config system interface" in content_lower:
        return "Fortigate"

    return "Cisco"