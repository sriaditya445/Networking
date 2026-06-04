from app.parsers.base_parser import BaseParser

from app.parsers.common.hostname_parser import (
    extract_hostname
)

from app.parsers.common.interface_parser import (
    extract_interfaces
)

from app.parsers.common.vlan_parser import (
    extract_vlans
)

from app.parsers.common.route_parser import (
    extract_routes
)

from app.parsers.common.audit_summary import (
    build_audit_summary
)

class CiscoParser(BaseParser):

    def parse(
        self,
        content,
        filename
    ):

        hostname = extract_hostname(
            content,
            filename
        )

        interfaces = extract_interfaces(
            content
        )

        vlans = extract_vlans(
            content
        )

        routes = extract_routes(
            content
        )

        configuration_json = {
            "hostname": hostname,
            "interfaces": interfaces,
            "vlans": vlans,
            "routes": routes
        }

        return {
            "device_name": hostname,
            "vendor": "Cisco",
            "device_type": "Switch",
            "parsed_data": {},
            "configuration_json":
                configuration_json,
            "audit_summary":
                build_audit_summary(
                    interfaces,
                    vlans,
                    routes,
                    []
                )
        }