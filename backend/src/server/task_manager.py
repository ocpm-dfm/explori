from typing import Any, List, Dict, TypeVar, Generic

from celery import Celery
from celery.result import AsyncResult
from fastapi import Depends
from pydantic import BaseModel

from cache import ShortTermCache, LongTermCache, task as task_key, preliminary_result, get_short_term_cache, \
    get_long_term_cache
from task_names import TaskName
from worker.main import app

T = TypeVar("T")


class TaskStatus(BaseModel, Generic[T]):
    status: str
    result: T | None = None
    preliminary: T | None = None


class TaskManager:
    __short_term_cache: ShortTermCache
    __long_term_cache: LongTermCache

    def __init__(self, short_term_cache: ShortTermCache, long_term_cache: LongTermCache):
        self.__short_term_cache = short_term_cache
        self.__long_term_cache = long_term_cache

    def cached_task(self, ocel: str, task, args: List[Any], kwargs: Dict[str, Any] | None,
                    task_name: TaskName | str, long_term_cache_key: str) -> TaskStatus:
        if kwargs is None:
            kwargs = {}

        # Easiest case: Task has run before, we can just fetch the result from the cache.
        if self.__long_term_cache.has(ocel, long_term_cache_key):
            return TaskStatus(status="done", result=self.__long_term_cache.get(ocel, long_term_cache_key))

        # Check if the task is currently running.
        running_result = self.check_on_running_task(ocel, task_name, long_term_cache_key)
        if running_result is not None:
            return running_result

        # The task is not running and has never run before. Hence, we need to start it.
        task_result: AsyncResult = task.delay(*args, **kwargs)
        self.__short_term_cache[TaskManager.__task_cache_key(ocel, task_name)] = task_result.id
        return TaskStatus(status="running")

    def check_on_running_task(self, ocel: str, task_name: TaskName | str,
                              long_term_cache_key: str) -> TaskStatus | None:
        if isinstance(task_name, TaskName):
            task_name = task_name.value

        task_cache_key = TaskManager.__task_cache_key(ocel, task_name)
        preliminary_result_cache_key = TaskManager.__task_cache_key(ocel, task_name)
        if task_cache_key not in self.__short_term_cache:
            return None

        # The task is currently running.
        task_result = AsyncResult(self.__short_term_cache[task_cache_key], app=app)

        if task_result.successful():
            # The task has finished since the last check.
            # We now write the result to the long term cache, clear up the short term cache and return the result.
            result = task_result.get()
            self.__long_term_cache.set(ocel, long_term_cache_key, result)
            self.__short_term_cache.delete(task_cache_key)
            self.__short_term_cache.delete(preliminary_result_cache_key)
            return TaskStatus(status="done", result=result)

        if task_result.failed():
            # The task has failed somehow, we clear up the short term caches and deliver the bad news.
            task_result.forget()
            self.__short_term_cache.delete(task_cache_key)
            self.__short_term_cache.delete(preliminary_result_cache_key)
            return TaskStatus(status="failed")

        # The task is still running or pending, we return the preliminary result
        return TaskStatus(status="running", preliminary=self.__short_term_cache.get(preliminary_result(ocel, "test")))

    @staticmethod
    def __task_cache_key(ocel: str, task_name: TaskName | str) -> str:
        if isinstance(task_name, TaskName):
            task_name = task_name.value
        return task_key(ocel, task_name)

    @staticmethod
    def __preliminary_result_cache_key(ocel: str, task_name: TaskName | str) -> str:
        if isinstance(task_name, TaskName):
            task_name = task_name.value
        return preliminary_result(ocel, task_name)


def get_task_manager(short_term_cache: ShortTermCache = Depends(get_short_term_cache),
                     long_term_cache: LongTermCache = Depends(get_long_term_cache)) -> TaskManager:
    return TaskManager(short_term_cache, long_term_cache)