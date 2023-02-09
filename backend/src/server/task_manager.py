from dataclasses import dataclass
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


@dataclass
class TaskDefinition:
    base_ocel: str
    task_name: TaskName | str
    task: Any
    args: List[Any]
    long_term_cache_key: str
    kwargs: Dict[str, Any] | None = None
    result_version: str | None = None


class TaskManager:
    __short_term_cache: ShortTermCache
    __long_term_cache: LongTermCache

    def __init__(self, short_term_cache: ShortTermCache, long_term_cache: LongTermCache):
        self.__short_term_cache = short_term_cache
        self.__long_term_cache = long_term_cache

    def cached_task(self, task: TaskDefinition, ignore_cache: bool = False) -> TaskStatus:
        """
        Checks whether the task result is already stored in the long term cache. If it has not been executed yet,
        it executes the task and returns eventual preliminary results.
        :param task: The task to be executed.
        :param ignore_cache: If set to true, the long term cache is ignored and the task is always executed.
        :return: The current status of the task, including eventual (preliminary) result.
        """
        ocel = task.base_ocel
        long_term_key = task.long_term_cache_key

        # Easiest case: Task has run before, we can just fetch the result from the cache.
        if not ignore_cache and self.__long_term_cache.has(ocel, long_term_key):
            cached_result = self.__long_term_cache.get(ocel, task.long_term_cache_key)
            if task.result_version is None or \
                    ("version" in cached_result and cached_result["version"] == task.result_version and "result" in cached_result):
                return TaskStatus(status="done", result=self.__long_term_cache.get(ocel, task.long_term_cache_key)["result"])

        # Check if the task is currently running.
        running_result = self.check_on_running_task(ocel, task.task_name, long_term_key, task.result_version)
        if running_result is not None:
            return running_result

        # The task is not running and has never run before. Hence, we need to start it.
        task_result: AsyncResult = task.task.delay(*task.args, **(task.kwargs if task.kwargs else {}))
        self.__short_term_cache[TaskManager.__task_cache_key(ocel, task.task_name)] = task_result.id
        return TaskStatus(status="running")

    def cached_group(self, tasks: Dict[str, TaskDefinition], ignore_cache: bool = False) -> TaskStatus:
        """
        Executes each task in the group and assembles the results of the individual tasks into one joint result.
        :param tasks: Dictionary of tasks to run. The key is being passed through to the result to allow identifying the individual tasks
        :param ignore_cache: If set to true, the long term cache is ignored and the task is always executed
        :return: TaskStatus containing joint results of the individual tasks and a merged status indicating the status of all tasks combined.
        """
        task_statuses: Dict[str, TaskStatus] = {key: self.cached_task(task, ignore_cache) for (key, task) in tasks.items()}

        assembled_result: Dict[str, Any] = {}
        is_preliminary: bool = False

        for (key, task) in task_statuses.items():
            if task.status == "failed":
                print("Failed because of task " + str(key))
                return TaskStatus(status="failed", result=None, preliminary=None)

            if task.status == "done":
                assembled_result[key] = task.result
            else:
                assembled_result[key] = task.preliminary
                is_preliminary = True

        if is_preliminary:
            return TaskStatus(status="running", result=None, preliminary=assembled_result)
        else:
            return TaskStatus(status="done", result=assembled_result, preliminary=None)

    def check_on_running_task(self, ocel: str, task_name: TaskName | str,
                              long_term_cache_key: str, version: str | None) -> TaskStatus | None:
        """
        Check the state of a task and handle it either still running, having finished running successfully,
        having finished running unsuccessfully with respect to the short term and long term cache.
        :param ocel: Name of ocel associated with the task to check on
        :param task_name: Name of task to check on
        :param long_term_cache_key: Long term cache key used to store the successful task result
        :return: TaskStatus of task that was checked or `None` if task is not running and has never run before
        """
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
            if version is not None:
                self.__long_term_cache.set(ocel, long_term_cache_key, {
                    'result': result,
                    'version': version
                })
            else:
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
        """
        Creates a task identifier for an ocel and an associated task
        :param ocel: Name of ocel associated with task
        :param task_name: Name of task
        :return: Combined identifier
        """
        if isinstance(task_name, TaskName):
            task_name = task_name.value
        return task_key(ocel, task_name)

    @staticmethod
    def __preliminary_result_cache_key(ocel: str, task_name: TaskName | str) -> str:
        """
        Creates a preliminary result identifier for an ocel and an associated task
        :param ocel: Name of ocel associated with task
        :param task_name: Name of task
        :return: Combined identifier
        """
        if isinstance(task_name, TaskName):
            task_name = task_name.value
        return preliminary_result(ocel, task_name)


def get_task_manager(short_term_cache: ShortTermCache = Depends(get_short_term_cache),
                     long_term_cache: LongTermCache = Depends(get_long_term_cache)) -> TaskManager:
    """
    Helper function to access a default task manager (when using default caches)
    :param short_term_cache: Short term cache which task manager should use
    :param long_term_cache: Long term cache which task manager should use
    :return: Task manager
    """
    return TaskManager(short_term_cache, long_term_cache)
