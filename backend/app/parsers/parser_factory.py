from app.parsers.cisco_parser import CiscoParser
from app.services.device_detector import detect_device_type

class ParserFactory:

    @staticmethod
    def get_parser(content):

        detection = detect_device_type(content)

        if detection.vendor == "Cisco":
            return CiscoParser()

        if detection.vendor == "Juniper":
            return JuniperParser()

        return CiscoParser()

