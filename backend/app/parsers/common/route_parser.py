import re

STATIC_ROUTE_REGEX = re.compile(
    r"^\s*ip route\s+([0-9.]+)\s+([0-9.]+)\s+(\S+)",
    re.IGNORECASE | re.MULTILINE
)

def extract_routes(content: str):

    routes = []

    for route in STATIC_ROUTE_REGEX.findall(content):

        routes.append({
            "network": route[0],
            "mask": route[1],
            "next_hop": route[2]
        })

    return routes