from app.parsers.cisco_parser import CiscoParser
from app.services.device_detector import detect_device

class ParserFactory:

    @staticmethod
    def get_parser(content):

        detection = detect_device(content)

        if detection["vendor_id"] == "Cisco":
            return CiscoParser()

        if detection["vendor_id"] == "Juniper":
            return JuniperParser()

        return CiscoParser()

