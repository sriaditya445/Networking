from app.parsers.base_parser import BaseParser
from app.parsers.cisco_regex_helpers import parse_device_config
from app.parsers.common.generic_config_parser import GenericConfigParser

class CiscoParser(BaseParser):
    def parse(self, content, filename):
        # 1. Basic device identification and segregation using regex
        base_parsed = parse_device_config(content, filename)
        
        # 2. Parse configuration to hierarchical JSON (generic parser)
        # This works for any vendor configuration format
        config_json = GenericConfigParser.parse_config(content)
        
        # 3. Return parsed results WITHOUT running audit here
        # Audit will happen separately in AuditWorker
        return {
            "device_name": base_parsed["device_name"],
            "vendor": "Cisco",
            "device_type": base_parsed["device_type"],
            # "parsed_data": base_parsed["parsed_data"],
            "configuration_json": config_json,
        }