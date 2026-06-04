from abc import ABC, abstractmethod

class BaseParser(ABC):

    @abstractmethod
    def parse(
        self,
        content: str,
        filename: str
    ):
        pass