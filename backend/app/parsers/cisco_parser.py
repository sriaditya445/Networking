import os
import re

from app.parsers.base_parser import BaseParser
from app.parsers.common.hostname_extractor import extract_hostname
from app.parsers.common.generic_config_parser import GenericConfigParser
from app.services.device_detector import detect_device_type

class CiscoParser(BaseParser):
    def parse(self, content, filename):
        # HOSTNAME_REGEX = re.compile(r"^\s*hostname\s+([a-zA-Z0-9-_]+)", re.IGNORECASE | re.MULTILINE)
        
        # def _extract_hostname(self, content: str, filename: str):
        #     match = self.HOSTNAME_REGEX.search(content)
        #     if match:
        #         return match.group(1)
        #     return os.path.splitext(filename)[0]

        hostname = extract_hostname(content,filename)
        detection = detect_device_type(content)
        config_json = GenericConfigParser.parse_config(content)
        
        return {
            "device_name": hostname,
            "vendor": detection.vendor,
            "device_type": detection.device_type,
            "configuration_json": config_json
        }