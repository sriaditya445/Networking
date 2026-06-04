from app.parsers.cisco_parser import CiscoParser
# from app.parsers.juniper_parser import JuniperParser

from app.parsers.common.vendor_detector import (
    detect_vendor
)

class ParserFactory:

    @staticmethod
    def get_parser(content):

        vendor = detect_vendor(
            content
        )

        if vendor == "Cisco":
            return CiscoParser()

        if vendor == "Juniper":
            return JuniperParser()

        return CiscoParser()