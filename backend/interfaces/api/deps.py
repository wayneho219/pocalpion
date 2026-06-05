from functools import lru_cache
from adapters.local_json_repository import LocalJsonRepository
from adapters.csv_name_provider import CsvNameProvider
from application.calculator import StatCalculator
from application.speed_service import SpeedService
from application.search_service import SearchService
from shared.config import DATA_JSON_PATH, CSV_PATH


@lru_cache(maxsize=1)
def get_repo() -> LocalJsonRepository:
    return LocalJsonRepository(DATA_JSON_PATH)


@lru_cache(maxsize=1)
def get_services() -> dict:
    calc = StatCalculator()
    repo = get_repo()
    csv_provider = CsvNameProvider(CSV_PATH)
    return {
        "calc": calc,
        "repo": repo,
        "search": SearchService(repo, csv_provider),
        "speed": SpeedService(calc),
    }


def clear_cache() -> None:
    get_repo.cache_clear()
    get_services.cache_clear()
