from app.parsers.parser_factory import (
    ParserFactory
)

class ParserService:

    @staticmethod
    def parse_device(
        content,
        filename
    ):

        parser = ParserFactory.get_parser(content)

        return parser.parse(
            content,
            filename
        )