import json
import os.path
from abc import ABC, abstractmethod
from dataclasses import is_dataclass, asdict
from enum import Enum
from hashlib import sha256
from multiprocessing import Lock
from typing import Any, Dict, List

import pm4py
from fastapi import Depends
from pydantic import BaseModel
from redis.client import Redis


class ShortTermCache(ABC):

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
    def delete(self, key: str) -> bool:
        pass

    def __getitem__(self, item: str) -> Any:
        return self.get(item)

    def __setitem__(self, key: str, value: Any):
        self.set(key, value)

    def __contains__(self, key: str):
        return self.has(key)


class DictionaryBasedCache(ShortTermCache):
    __cache: Dict[str, Any]
    __lock: Lock

    def __init__(self):
        self.__cache = {}
        self.__lock = Lock()

    def set(self, key: str, value: Any):
        with self.__lock:
            self.__cache[key] = value

    def has(self, key: str) -> bool:
        with self.__lock:
            return key in self.__cache

    def get(self, key: str, default: Any = None) -> Any:
        with self.__lock:
            if key in self.__cache:
                return self.__cache[key]
            return default

    def delete(self, key: str) -> bool:
        has_key = key in self
        if not has_key:
            return False

        with self.__lock:
            self.__cache.pop(key)
            return True


class RedisCache(ShortTermCache):
    __redis_connection: Redis

    def __init__(self, host: str, port: int):
        self.__redis_connection = Redis(host, port)

    def set(self, key: str, value: Any):
        self.__redis_connection.set(key, json.dumps(make_json_serilizable(value)))

    def has(self, key: str) -> bool:
        return self.__redis_connection.get(key) is not None

    def get(self, key: str, default: Any = None) -> Any:
        data = self.__redis_connection.get(key)
        if data is None:
            return default
        return json.loads(data)

    def delete(self, key: str) -> bool:
        return self.__redis_connection.delete(key) == 1


__SHORT_TERM_CACHE = RedisCache("localhost", 6379)


def get_short_term_cache() -> ShortTermCache:
    return __SHORT_TERM_CACHE


class LongTermCacheEntryType(Enum):
    JSONABLE = "json"
    CLASSIC_EVENT_LOG = "xes"
    OCEL = "jsonocel"


class LongTermCache(ABC):

    @abstractmethod
    def set(self, ocel: str, key: str, value: Any,
            value_type: LongTermCacheEntryType = LongTermCacheEntryType.JSONABLE):
        pass

    @abstractmethod
    def has(self, ocel: str, key: str, value_type: LongTermCacheEntryType = LongTermCacheEntryType.JSONABLE) -> bool:
        pass

    @abstractmethod
    def get(self, ocel: str, key: str,
            value_type: LongTermCacheEntryType = LongTermCacheEntryType.JSONABLE) -> Any:
        pass

    @abstractmethod
    def get_folder(self, ocel: str) -> Any:
        pass

class FileBasedLongTermCache(LongTermCache):

    __cache_folder: str

    def __init__(self, folder: str):
        self.__cache_folder = folder

    def set(self, ocel: str, key: str, value: Any,
            value_type: LongTermCacheEntryType = LongTermCacheEntryType.JSONABLE):
        filename = self.__get_file_name(ocel, key, value_type)

        match value_type:
            case LongTermCacheEntryType.JSONABLE:
                with open(self.__get_file_name(ocel, key, value_type), 'w') as f:
                    json.dump(make_json_serilizable(value), f)
            case LongTermCacheEntryType.CLASSIC_EVENT_LOG:
                pm4py.write_xes(value, filename)
            case _:
                raise NotImplementedError()

    def has(self, ocel: str, key: str, value_type: LongTermCacheEntryType = LongTermCacheEntryType.JSONABLE) -> bool:
        return os.path.isfile(self.__get_file_name(ocel, key, value_type))

    def get(self, ocel: str, key: str,
            value_type: LongTermCacheEntryType = LongTermCacheEntryType.JSONABLE) -> Any:
        filename = self.__get_file_name(ocel, key, value_type)
        if not os.path.isfile(filename):
            return None

        match value_type:
            case LongTermCacheEntryType.JSONABLE:
                with open(filename, 'r') as f:
                    return json.load(f)
            case LongTermCacheEntryType.CLASSIC_EVENT_LOG:
                return pm4py.read_xes(filename)
            case _:
                raise NotImplementedError()

    def get_folder(self, ocel: str) -> str:
        return self.__get_ocel_cache_folder(ocel)

    def __get_file_name(self, ocel: str, key: str, value_type: LongTermCacheEntryType) -> str:
        return os.path.join(self.__get_ocel_cache_folder(ocel), f"{key}.{value_type.value}")

    def __get_ocel_cache_folder(self, ocel: str) -> str:
        digest = sha256(ocel.encode("UTF-8")).hexdigest()
        folder = os.path.join(self.__cache_folder, digest)
        os.makedirs(folder, exist_ok=True)
        return folder


__LONG_TERM_CACHE = FileBasedLongTermCache("cache")


def get_long_term_cache() -> LongTermCache:
    return __LONG_TERM_CACHE


# region Cache keys
def __extra_attribute(attribute: str, values: str | List[str] | int | float | None) -> str:
    if values is None:
        return ""
    if isinstance(values, list):
        values = '(' + ','.join([str(x) for x in values]) + ')'
    return f"({attribute}={values})"


def task(ocel: str, task_identifier: str):
    return f"[ocel={ocel}].task{__extra_attribute('id', task_identifier)}"


def preliminary_result(ocel: str, task_identifier: str):
    return f"[ocel={ocel}].task{__extra_attribute('id', task_identifier)}.preliminary"


def metadata() -> str:
    return f"objectTypes"


def projected_log(object_type: str) -> str:
    return f"projection-{object_type}"


def projected_log_traces(object_type: str) -> str:
    return f"projection-{object_type}-traces"


def dfm(ignored_object_types: List[str] | None = None) -> str:
    return f"dfm{__extra_attribute('ignored', ignored_object_types)}"


def alignments(base_threshold: float, object_type: str | None) -> str:
    return f"alginments-{object_type}-{base_threshold}"
# endregion


def make_json_serilizable(data: Dict[str, Any] | List[Any] | BaseModel | str | int | float):
    if isinstance(data, list):
        return [make_json_serilizable(x) for x in data]
    elif isinstance(data, dict):
        return {key: make_json_serilizable(value) for (key, value) in data.items()}
    elif isinstance(data, BaseModel):
        return make_json_serilizable(data.dict())
    elif is_dataclass(data):
        return make_json_serilizable(asdict(data))
    else:
        return data # Assume the remaining cases are json-compatible atomic values