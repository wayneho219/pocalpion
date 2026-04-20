from abc import ABC, abstractmethod
from domain.models.pokemon import Pokemon


class AbstractPokeRepository(ABC):

    @abstractmethod
    def get_by_id(self, pokemon_id: int, name_zh: str = "", name_ja: str = "") -> Pokemon:
        ...

    @abstractmethod
    def get_by_name(self, name: str) -> Pokemon:
        ...

    @abstractmethod
    def search(self, query: str) -> list[Pokemon]:
        ...
