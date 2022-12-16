from typing import Dict, Tuple, List, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from cache import dfm
from server.task_manager import get_task_manager, TaskManager, TaskStatus
from server.utils import ocel_filename_from_query
from task_names import TaskName
from worker.tasks.dfm import dfm as dfm_task

router = APIRouter(prefix="/pm",
                   tags=['Process mining'])


# region /dfm Get filtered DFM
class DFMNodeResponseModel(BaseModel):
    label: str
    threshold: float
    counts: List[Tuple[float, int]]


class DFMEdgeResponseModel(BaseModel):
    source: int
    target: int
    threshold: float
    counts: List[Tuple[float, int]]


class DFMResponseModel(BaseModel):
    thresholds: List[float]
    traces: List[Any]
    nodes: List[DFMNodeResponseModel]
    subgraphs: Dict[str, List[DFMEdgeResponseModel]]

    class Config:
        pass  # TODO: Create example output


@router.get('/dfm', response_model=TaskStatus[DFMResponseModel], tags=['Process Mining'])
def calculate_dfm_with_thresholds(ocel: str = Depends(ocel_filename_from_query),
                    task_manager: TaskManager = Depends(get_task_manager)):
    """
    Async: Tries to load the given OCEL from the data folder, calculates the DFM and the threshold associated with
    each edge and node.
    """
    return task_manager.cached_task(ocel, dfm_task, [ocel], None,
                                    TaskName.CREATE_DFM, dfm(),
                                    ignore_cache=False, version="3")
# endregion
