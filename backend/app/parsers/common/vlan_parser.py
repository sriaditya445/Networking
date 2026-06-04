import re

VLAN_REGEX = re.compile(
    r"switchport access vlan\s+(\d+)",
    re.IGNORECASE
)

def extract_vlans(content: str):

    return sorted(
        list(
            set(
                VLAN_REGEX.findall(content)
            )
        )
    )