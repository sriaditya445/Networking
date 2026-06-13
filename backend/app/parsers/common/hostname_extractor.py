# app/parsers/common/hostname_extractor.py

import os
import re

HOSTNAME_REGEX = re.compile(r"^\s*hostname\s+([a-zA-Z0-9-_]+)", re.IGNORECASE | re.MULTILINE)

def extract_hostname(content: str, filename: str):
    match = HOSTNAME_REGEX.search(content)
    if match:
        return match.group(1)
    return os.path.splitext(filename)[0]