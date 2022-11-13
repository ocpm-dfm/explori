from abc import ABC, abstractmethod
from typing import Any, Dict, List

from fastapi import Depends


class ExploriCache(ABC):

    @abstractmethod
    def set(self, key: str, value: Any):
        pass

    @abstractmethod
    def has(self, key: str) -> bool:
        pass

    @abstractmethod
    def get(self, key: str, default: Any = None) -> Any:
        pass

    @abstractmethod
    def invalidate(self):
        pass

    def __getitem__(self, item: str) -> Any:
        return self.get(item)

    def __setitem__(self, key: str, value: Any):
        self.set(key, value)

    def __contains__(self, key: str):
        return self.has(key)


class DictionaryBasedCache(ExploriCache):
    __cache: Dict[str, Any]

    def __init__(self):
        self.__cache = {}

    def set(self, key: str, value: Any):
        self.__cache[key] = value

    def has(self, key: str) -> bool:
        return key in self.__cache

    def get(self, key: str, default: Any = None) -> Any:
        if key in self.__cache:
            return self.__cache[key]
        return default

    def invalidate(self):
        self.__cache = {}


# May be to do: implement a REDIS base cache for distributed workers
__CACHE = DictionaryBasedCache()


def get_cache() -> ExploriCache:
    return Depends(lambda: __CACHE)


# region Cache keys
def __extra_attribute(attribute: str, values: str | List[str] | None) -> str:
    if values is None:
        return ""
    return f"[{attribute}={values}]"


def dfm(ignored_object_types: List[str] | None = None) -> str:
    return f"dfm{__extra_attribute('ignored', ignored_object_types)}"


def projected_log(object_type: str) -> str:
    return f"projection.{object_type}.log"


def projected_log_traces(object_type: str) -> str:
    return f"projection.{object_type}.traces"


def alignments(base_threshold: float, object_type: str | None) -> str:
    return f"alginments{__extra_attribute('thresh', base_threshold)}{__extra_attribute('object_type', object_type)}"
# endregion