import os
import re

from app.parsers.base_parser import BaseParser
from app.parsers.common.hostname_extractor import extract_hostname
from app.parsers.common.generic_config_parser import GenericConfigParser
from app.services.device_detector import detect_device_type

class CiscoParser(BaseParser):
    def parse(self, content, filename):
        hostname = extract_hostname(content,filename)
        detection = detect_device_type(content)
        config_json = GenericConfigParser.parse_config(content)
        
        return {
            "device_name": hostname,
            "vendor": detection.vendor,
            "device_type": detection.device_type,
            "model": detection.model,
            "configuration_json": config_json
        }