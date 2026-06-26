from app.parsers.cisco_parser import CiscoParser
from app.services.device_detector import detect_device_type


class ParserService:

    @staticmethod
    def parse_device(content: str, filename: str):

        detection = detect_device_type(content)

        parsers = {
            "Cisco": CiscoParser
        }

        parser_cls = parsers.get(
            detection.vendor,
            CiscoParser
        )

        parser = parser_cls()

        return parser.parse(
            content=content,
            filename=filename,
            detection=detection
        )