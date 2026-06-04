import re

INTERFACE_REGEX = re.compile(
    r"^\s*interface\s+(\S+)",
    re.IGNORECASE | re.MULTILINE
)

def extract_interfaces(content: str):

    return INTERFACE_REGEX.findall(content)


# def extract_interfaces(content: str):

#     return INTERFACE_REGEX.findall(content)
