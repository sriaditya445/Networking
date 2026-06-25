import os
import re

from app.parsers.base_parser import BaseParser
from app.parsers.common.hostname_extractor import extract_hostname
from app.parsers.common.generic_config_parser import GenericConfigParser

class CiscoParser(BaseParser):
    def parse(self, content, filename):
        hostname = extract_hostname(content,filename)
        config_json = GenericConfigParser.parse_config(content)
        
        return {
            "device_name": hostname,
            "configuration_json": config_json
        }
