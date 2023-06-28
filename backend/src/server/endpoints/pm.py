import pprint
from typing import Dict, Tuple, List, Any

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from starlette import status

from cache import dfm as dfm_cache_key, alignments, performance_metrics, aligned_times, ocel_performance_metrics
from server.task_manager import get_task_manager, TaskManager, TaskStatus, TaskDefinition
from server.utils import ocel_filename_from_query, secure_ocel_filename
from shared_types import FrontendFriendlyDFM
from task_names import TaskName
from worker.tasks.dfm import dfm as dfm_task
from worker.tasks.alignments import compute_alignments as alignment_task, TraceAlignment
from worker.tasks.performance import calculate_performance_metrics as performance_task, ocel_performance_metrics_task
from worker.tasks.performance import align_projected_log_times_task

router = APIRouter(prefix="/pm",
                   tags=['Process Mining'])

# The endpoints in this file are a little strange when compared to the other endpoints. That's because the endpoints in
# this file are meant to be polled continuously by the frontend. Hence, if a result is not available yet, we don't wait
# until the computation is complete but instead immediately result a status that the computation is still running.
# This allows for the FastAPI server to quickly respond to all requests and we don't have to deal with issues such as
# blocked servers or timeouting requests.

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
    each edge, node and trace.
    :param ocel: Path to ocel
    :param task_manager: Taskmanager to run the dfm construction task with
    :return: Taskstatus (potentially containing the previously computed (partial) result) of dfm construction task
    """
    return run_dfm_task(ocel, task_manager)


# endregion


@router.get('/alignments', response_model=TaskStatus[AlignmentResponseModel])
def compute_alignments(process_ocel: str = Query(example="uploaded/demo-ocel.jsonocel"),
                       conformance_ocel: str = Query(example="uploaded/demo-ocel.jsonocel"),
                       threshold: float = Query(example=0.75),
                       task_manager: TaskManager = Depends(get_task_manager)):
    """
    Async: Computes alignments of the projected traces in the conformance OCEL based on DFM constructed from the process
    OCEL and the threshold.
    :param process_ocel: Path to ocel used in DFM construction
    :param conformance_ocel: Path to ocel to align with the DFM
    :param threshold: Filtering threshold
    :param task_manager: Taskmanager to run the dfm construction task with
    :return: Taskstatus (potentially containing the previously computed (partial) result) of alignment calculation task
    """
    # We cannot use "Depends(ocel_filename_from_query)" for the OCELs since it's parameter name is hardcoded.
    # Therefore, we have to ensure that we have safe paths (i.e. no path transitions).
    process_ocel = secure_ocel_filename(process_ocel)
    conformance_ocel = secure_ocel_filename(conformance_ocel)

    process_dfm = get_dfm(process_ocel, task_manager)
    # We also get the DFM of the conformance OCEL which is a slight overkill way to get all the object types and traces
    # from the conformance OCEL.
    conformance_dfm = get_dfm(conformance_ocel, task_manager)

    if process_dfm is None or conformance_ocel is None:
        return TaskStatus(status="running", result=None, preliminary=None)

    result = run_alignment_tasks(process_ocel, conformance_ocel, process_dfm, conformance_dfm, threshold, task_manager)

    def reformat_output(task_output: Dict[Tuple[str, int], Any] | None):
        """Remaps the output of the grouped tasks into a frontend friendly form."""
        if task_output is None:
            return None

        return [
            {
                object_type: task_output[object_type, trace_id]
                for object_type in conformance_dfm.traces[trace_id].thresholds
            }
            for trace_id in range(len(conformance_dfm.traces))
        ]

    result.result = reformat_output(result.result)
    result.preliminary = reformat_output(result.preliminary)
    return result


@router.get('/performance', response_model=TaskStatus[Any])
def compute_legacy_performance_metrics(process_ocel: str = Query(example="uploaded/demo-ocel.jsonocel"),
                                       metrics_ocel: str = Query(example="uploaded/demo-ocel.jsonocel"),
                                       threshold: float = Query(example=0.75),
                                       task_manager: TaskManager = Depends(get_task_manager)):
    """
    This is the legacy / Sprint 3 performance metrics endpoint. It computes the performance metrics
    of the aligned projected event logs.
    :param process_ocel: Path to ocel used in DFM construction
    :param metrics_ocel: Path to ocel to align with the DFM and then compute the performance metrics for
    :param threshold: Filtering threshold
    :param task_manager: Taskmanager to run the dfm construction task with
    :return: Taskstatus (potentially containing the previously computed (partial) result) of performance metrics task
    """
    process_ocel = secure_ocel_filename(process_ocel)
    metrics_ocel = secure_ocel_filename(metrics_ocel)

    # First we determine the DFMs in order to calculate the alignments in the next steps.
    process_dfm = get_dfm(process_ocel, task_manager)
    metrics_dfm = get_dfm(metrics_ocel, task_manager)

    if process_dfm is None or metrics_dfm is None:
        return TaskStatus(status="running", result=None, preliminary=None)

    # Now, the alignments are calculated.
    alignments_status = run_alignment_tasks(process_ocel, metrics_ocel, process_dfm, metrics_dfm, threshold,
                                            task_manager)
    if alignments_status.status != "done":
        return TaskStatus(status="running", preliminary=None, result=None)

    # The final step is to align the projected logs and to calculate waiting times.
    alignments_by_object_type = {}
    for ((object_type, _), alignment) in alignments_status.result.items():
        alignments_by_object_type.setdefault(object_type, []).append(alignment)

    threshold = box_threshold(process_dfm, threshold)

    tasks = {
        object_type: TaskDefinition(metrics_ocel,
                                    TaskName.PERFORMANCE_METRICS.with_attributes(process_ocel=process_ocel,
                                                                                 metrics_ocel=metrics_ocel,
                                                                                 threshold=threshold,
                                                                                 object_type=object_type),
                                    performance_task, [metrics_ocel, object_type, alignments],
                                    performance_metrics(process_ocel, threshold, object_type),
                                    result_version="2")
        for (object_type, alignments) in alignments_by_object_type.items()
    }

    return task_manager.cached_group(tasks)


@router.get('/ocel-performance', response_model=TaskStatus[Any])
def compute_ocel_performance_metrics(process_ocel: str = Query(example="uploaded/demo-ocel.jsonocel"),
                                     metrics_ocel: str = Query(example="uploaded/demo-ocel.jsonocel"),
                                     threshold: float = Query(example=0.75),
                                     task_manager: TaskManager = Depends(get_task_manager)):
    """
    Async: Calculates aligned OperA performance metrics.
    :param process_ocel: Path to ocel used in DFM construction
    :param metrics_ocel: Path to ocel to align with the DFM and then compute the performance metrics for
    :param threshold: Filtering threshold
    :param task_manager: Taskmanager to run the dfm construction task with
    :return: Taskstatus (potentially containing the previously computed (partial) result) of performance metrics task
    """
    process_ocel = secure_ocel_filename(process_ocel)
    metrics_ocel = secure_ocel_filename(metrics_ocel)

    # Step 1. Calculate the DFMs of the both OCELs. (Needed for the alignments)
    process_dfm = get_dfm(process_ocel, task_manager)
    metrics_dfm = get_dfm(metrics_ocel, task_manager)

    if process_dfm is None or metrics_dfm is None:
        return TaskStatus(status="running", result=None, preliminary=None)

    # Step 2. Calculate the alignments. (Needed for to align the projected OCELs)
    alignments_status = run_alignment_tasks(process_ocel, metrics_ocel, process_dfm, metrics_dfm, threshold,
                                            task_manager)
    if alignments_status.status != "done":
        return TaskStatus(status="running", preliminary=None, result=None)

    # Step 3. Align the timestamps of the projected event logs (one task per object type).
    alignments_by_object_type = {}
    for ((object_type, _), alignment) in alignments_status.result.items():
        alignments_by_object_type.setdefault(object_type, []).append(alignment)

    threshold = box_threshold(process_dfm, threshold)

    align_times_tasks = {
        object_type: TaskDefinition(metrics_ocel,
                                    TaskName.ALIGN_TIMES.with_attributes(process_ocel=process_ocel,
                                                                         metrics_ocel=metrics_ocel,
                                                                         threshold=threshold,
                                                                         object_type=object_type),
                                    align_projected_log_times_task, [metrics_ocel, object_type, alignments],
                                    aligned_times(process_ocel, threshold, object_type),
                                    result_version="1")
        for (object_type, alignments) in alignments_by_object_type.items()
    }

    aligned_times_status = task_manager.cached_group(align_times_tasks)
    if aligned_times_status.status != "done":
        return TaskStatus(status="running", preliminary=None, result=None)

    # Step 4. Actually calculating the performance metrics.
    # We sort the object types so the cache keys are consistent.
    object_types = sorted(list(aligned_times_status.result.keys()))
    ocel_metrics_task = TaskDefinition(metrics_ocel,
                                       TaskName.PERFORMANCE_METRICS.with_attributes(
                                           process_ocel=process_ocel,
                                           metrics_ocel=metrics_ocel,
                                           threshold=threshold,
                                           object_types=object_types),
                                       ocel_performance_metrics_task, [metrics_ocel, aligned_times_status.result],
                                       ocel_performance_metrics(process_ocel, threshold, object_types),
                                       result_version="2")
    return task_manager.cached_task(ocel_metrics_task)


def get_dfm(ocel: str, task_manager: TaskManager, ignore_cache: bool = False) -> FrontendFriendlyDFM | None:
    """
    Helper function running the dfm construction task and returning the finished result once it's available
    :param ocel: Path to ocel to use in DFM construction
    :param task_manager: Taskmanager to run the dfm construction task with
    :param ignore_cache: If set to true, the taskmanager ignores cached results and the task is always executed
    :return: Constructed DFM or `None` when the construction task isn't finished yet
    """
    task = run_dfm_task(ocel, task_manager, ignore_cache)
    if task.status != "done":
        return None
    return FrontendFriendlyDFM(**task.result)


def run_dfm_task(ocel: str, task_manager, ignore_cache=False):
    """
    Creates dfm construction task definition and queues the task with the task manager.
    :param ocel: Path to ocel to use in DFM construction
    :param task_manager: Taskmanager to run the dfm construction task with
    :param ignore_cache: If set to true, the taskmanager ignores cached results and the task is always executed
    :return: Taskstatus (potentially containing the previously computed (partial) result) of dfm construction task
    """
    dfm_task_definition = TaskDefinition(ocel, TaskName.CREATE_DFM, dfm_task, [ocel], dfm_cache_key(),
                                         result_version="3")
    return task_manager.cached_task(dfm_task_definition, ignore_cache)


def run_alignment_tasks(process_ocel: str,
                        conformance_ocel: str,
                        process_dfm: FrontendFriendlyDFM,
                        conformance_dfm: FrontendFriendlyDFM,
                        threshold: float,
                        task_manager: TaskManager):
    """
    Creates alignment calculation task definition and queues the task with the task manager.
    :param process_ocel: Path to ocel used in DFM construction
    :param conformance_ocel: Path to ocel to align with the DFM
    :param process_dfm: Constructed process DFM
    :param conformance_dfm: Conformance DFM to align
    :param threshold: Filtering threshold
    :param task_manager: Taskmanager to run the alignment calculation task with
    :return: Taskstatus (potentially containing the previously computed (partial) result) of alignment calculation task
    """
    if not set(conformance_dfm.subgraphs.keys()).issubset(process_dfm.subgraphs.keys()):
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED,
                            detail="The object types of the OCELS do not match.")

    threshold = box_threshold(process_dfm, threshold)

    tasks = {
        (object_type, trace_id): TaskDefinition(
            base_ocel=process_ocel,
            task_name=TaskName.COMPUTE_ALIGNMENTS.with_attributes(conformance_ocel=conformance_ocel,
                                                                  base_threshold=threshold,
                                                                  object_type=object_type,
                                                                  trace_id=trace_id),
            task=alignment_task,
            args=[process_ocel, threshold, object_type,
                  [conformance_dfm.nodes[node_id].label for node_id in conformance_dfm.traces[trace_id].actions]],
            long_term_cache_key=alignments(threshold, conformance_ocel, object_type, trace_id),
            result_version="2"
        )
        for trace_id in range(len(conformance_dfm.traces))
        for object_type in conformance_dfm.traces[trace_id].thresholds
    }

    return task_manager.cached_group(tasks)


def box_threshold(dfm: FrontendFriendlyDFM, threshold: float) -> float:
    base_threshold = 0
    for threshold_candidate in dfm.thresholds:
        if threshold_candidate <= threshold:
            base_threshold = threshold_candidate
        else:
            return base_threshold
    return base_threshold
