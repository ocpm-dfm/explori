from typing import Dict, Tuple, List, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from cache import dfm as dfm_cache_key, alignments
from server.task_manager import get_task_manager, TaskManager, TaskStatus, TaskDefinition
from server.utils import ocel_filename_from_query, secure_ocel_filename
from shared_types import FrontendFriendlyDFM
from task_names import TaskName
from worker.tasks.dfm import dfm as dfm_task
from worker.tasks.alignments import compute_alignments as alignment_task, TraceAlignment

router = APIRouter(prefix="/pm",
                   tags=['Process Mining'])


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


class AlignmentResponseModel(BaseModel):
    aligned_traces_by_object_type: Dict[str, Dict[str, List[TraceAlignment]]]


@router.get('/dfm', response_model=TaskStatus[DFMResponseModel])
def calculate_dfm_with_thresholds(ocel: str = Depends(ocel_filename_from_query),
                    task_manager: TaskManager = Depends(get_task_manager)):
    """
    Async: Tries to load the given OCEL from the data folder, calculates the DFM and the threshold associated with
    each edge and node.
    """
    task = TaskDefinition(ocel, TaskName.CREATE_DFM, dfm_task, [ocel], dfm_cache_key(), result_version="3")
    return task_manager.cached_task(task, ignore_cache=False)
# endregion


@router.get('/alignments', response_model=TaskStatus[AlignmentResponseModel])
def compute_alignments(process_ocel: str = Query(example="uploaded/p2p-normal.jsonocel"),
                       conformance_ocel: str = Query(example="uploaded/p2p-normal.jsonocel"),
                       threshold: float = Query(example=0.75),
                       task_manager: TaskManager = Depends(get_task_manager)):

    process_ocel = secure_ocel_filename(process_ocel)
    conformance_ocel = secure_ocel_filename(conformance_ocel)

    dfm_task_definition = TaskDefinition(process_ocel, TaskName.CREATE_DFM, dfm_task, [process_ocel], dfm_cache_key(), result_version="3")
    dfm_task_result = task_manager.cached_task(dfm_task_definition)
    if dfm_task_result.status != "done":
        return dfm_task_result

    dfm = FrontendFriendlyDFM(**dfm_task_result.result)

    base_threshold = 0
    for threshold_candidate in dfm.thresholds:
        if threshold_candidate <= threshold:
            base_threshold = threshold_candidate
        else:
            break

    tasks = {
        object_type: TaskDefinition(
            base_ocel=process_ocel,
            task_name=TaskName.COMPUTE_ALIGNMENTS.with_attributes(process_ocel=process_ocel,
                                                                  conformance_ocel=conformance_ocel,
                                                                  base_threshold=base_threshold),
            task=alignment_task,
            args=[process_ocel, conformance_ocel, base_threshold, object_type],
            long_term_cache_key=alignments(base_threshold, conformance_ocel, object_type),
        )
        for object_type in dfm.subgraphs
    }

    return task_manager.cached_group(tasks)
# endregion
