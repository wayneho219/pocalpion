from typing import Union


class PokemonNotFoundError(Exception):
    def __init__(self, identifier: Union[int, str]) -> None:
        super().__init__(f"Pokemon not found: {identifier}")
        self.identifier = identifier
