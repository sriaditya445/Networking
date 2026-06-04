from app.parsers.base_parser import BaseParser
from app.parsers.cisco_regex_helpers import parse_device_config
from app.services.audit_engine import AuditEngine

class CiscoParser(BaseParser):
    def parse(self, content, filename):
        # 1. Basic Segregation & Identification
        base_parsed = parse_device_config(content, filename)
        
        # 2. Run the Compliance Audit
        audit_result = AuditEngine.run_audit(content, base_parsed["device_type"])
        
        # 3. Merge and return results
        return {
            "device_name": base_parsed["device_name"],
            "vendor": "Cisco",
            "device_type": base_parsed["device_type"],
            "parsed_data": base_parsed["parsed_data"],
            "configuration_json": base_parsed["configuration_json"],
            "audit_status": audit_result["score"] >= 100 and "SUCCESS" or "FAILED",
            "audit_score": audit_result["score"],
            "audit_summary": audit_result["summary"],
            "findings": audit_result["findings"]
        }