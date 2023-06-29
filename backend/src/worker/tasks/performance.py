import math
from collections import namedtuple
from datetime import datetime
from math import isnan
from typing import Dict, Any, List, Tuple

import pm4py
from pandas import DataFrame, Timedelta, Timestamp
from pandas.core.groupby import DataFrameGroupBy
from pm4py.objects.log.obj import EventLog, Trace
from pydantic import BaseModel

from worker.main import app
from worker.tasks.alignments import TraceAlignment, SKIP_MOVE
from worker.tasks.dfm import START_TOKEN, STOP_TOKEN, Node, ObjectType
from worker.utils import get_projected_event_log, get_ocel

OCELEventId = int
ProjectedEventTime = namedtuple("ProjectedEventTimes", ['aligned_time', 'model_move_counter'])
AlignedEdgeTimes = namedtuple("AlignedEdgeTimes", ['previous_activity', 'activation_time', 'execution_time'])


# region Aligning timestamps for OCEL metrics
@app.task()
def align_projected_log_times_task(base_ocel: str, object_type: str, alignments: List[Dict[str, Any]]):
    projected_event_log: EventLog = get_projected_event_log(base_ocel, object_type)
    projected_event_log: DataFrame = pm4py.convert_to_dataframe(projected_event_log)
    projected_event_log: DataFrameGroupBy = projected_event_log.groupby('case:concept:name')

    alignments_dict = preprocess_alignments(alignments)
    aligned_times: Dict[OCELEventId, Dict[str, ProjectedEventTime]] = {}

    for object_id, case in projected_event_log:
        case: DataFrame = case
        aligned_case_times = align_case(case, alignments_dict)

        for (ocel_event_id, time) in aligned_case_times.items():
            aligned_times.setdefault(int(ocel_event_id), {})[object_id] = time

    return aligned_times


def align_case(case: DataFrame, alignments: Dict[Any, TraceAlignment]) -> Dict[OCELEventId, AlignedEdgeTimes]:
    model_move_counter = 0
    result = {}

    alignment = alignments[tuple(case['concept:name'])]
    last_activity = None
    finish_time_of_previous_activity = None

    case_position = 0
    for (log_move, model_move) in zip(alignment.log_alignment, alignment.model_alignment):
        log_move: str = log_move.activity
        model_move: str = model_move.activity

        if log_move == START_TOKEN or log_move == STOP_TOKEN:
            continue

        if model_move == SKIP_MOVE:
            # Log-moves are ignored.
            case_position += 1
            continue

        if log_move == SKIP_MOVE:
            model_move_counter += 1
            continue

        assert log_move == model_move
        event = case.iloc[case_position]
        ocel_event_id = event['event_id']
        start_timestamp = event['event_start_timestamp']
        finish_timestamp = event['time:timestamp']

        result[ocel_event_id] = AlignedEdgeTimes(previous_activity=last_activity,
                                                 activation_time=finish_time_of_previous_activity,
                                                 execution_time=ProjectedEventTime(start_timestamp, model_move_counter))

        case_position += 1
        last_activity = event['concept:name']
        finish_time_of_previous_activity = ProjectedEventTime(finish_timestamp, model_move_counter)
    return result


# endregion


# region Calculating performance metrics from aligned times and OCEL
class CollectedTimes(BaseModel):
    waiting_times: Dict[Node, List[int]]
    service_times: Dict[Node, List[int]]
    sojourn_times: Dict[Node, List[int]]
    pooling_times: Dict[Node, Dict[ObjectType, List[int]]]
    synchronization_times: Dict[Node, List[int]]
    lagging_times: Dict[Node, Dict[ObjectType, List[int]]]
    flow_times: Dict[Node, List[int]]
    edge_pooling_times: Dict[Node, Dict[Node, Dict[ObjectType, List[int]]]]
    edge_waiting_times: Dict[Node, Dict[Node, Dict[ObjectType, List[int]]]]


class AggregatedMetric(BaseModel):
    min: int
    median: int
    max: int
    mean: int
    stdev: float
    sum: int


class NodePerformanceMetrics(BaseModel):
    service_time: AggregatedMetric
    waiting_time: AggregatedMetric | None
    sojourn_time: AggregatedMetric | None
    synchronization_time: AggregatedMetric | None
    lagging_times: Dict[ObjectType, AggregatedMetric]
    pooling_times: Dict[ObjectType, AggregatedMetric]
    flow_time: AggregatedMetric | None


class EdgePerformanceMetrics(BaseModel):
    pooling_time: AggregatedMetric
    waiting_time: AggregatedMetric


class FrontendFriendlyPerformanceMetrics(BaseModel):
    nodes: Dict[Node, NodePerformanceMetrics]
    edges: Dict[Node, Dict[Node, Dict[ObjectType, EdgePerformanceMetrics]]]


@app.task()
def ocel_performance_metrics_task(ocel: str, aligned_times: Dict[ObjectType, Dict[str, Dict[str, ProjectedEventTime]]]):
    ocel: DataFrame = get_ocel(ocel).log.log
    collected_times = collect_times(ocel, aligned_times)
    return aggregate_times_to_frontend_friendly(collected_times).dict()


def collect_times(ocel: DataFrame, aligned_times: Dict[ObjectType, Dict[str, Dict[str, ProjectedEventTime]]]):
    """Calculates all occurring node waiting times, service times, sourjourn times, node pooling times,
    synchronization times, lagging times, flow times, edge pooling times and edge waiting times.
    The calculated times are returned without any aggregation, that why they are 'collected'."""

    waiting_times: Dict[Node, List[int]] = {}
    service_times: Dict[Node, List[int]] = {}
    sojourn_times: Dict[Node, List[int]] = {}
    pooling_times: Dict[Node, Dict[ObjectType, List[int]]] = {}
    lagging_times: Dict[Node, Dict[ObjectType, List[int]]] = {}
    synchronization_times: Dict[Node, List[int]] = {}
    flow_times: Dict[Node, List[int]] = {}
    edge_pooling_times: Dict[Node, Dict[Node, Dict[ObjectType, List[int]]]] = {}
    edge_waiting_times: Dict[Node, Dict[Node, Dict[ObjectType, List[int]]]] = {}

    for _, event in ocel.iterrows():
        event_id = str(event['event_id'])
        event_activity = event['event_activity']

        event_start_timestamp: Timestamp = event['event_start_timestamp']
        if not isinstance(event_start_timestamp, Timestamp):
            event_start_timestamp = Timestamp(ts_input=event_start_timestamp)

        event_end_timestamp: Timestamp = event['event_timestamp']
        if not isinstance(event_end_timestamp, Timestamp):
            event_end_timestamp = Timestamp(ts_input=event_end_timestamp)

        service_time: Timedelta = event_end_timestamp - event_start_timestamp

        event_first_activation: Timestamp | None = None
        ot_activation_times: List[Timestamp] = []
        ot_first_activation_times: Dict[str, Timestamp] = {}

        for (object_type, ot_times) in aligned_times.items():
            first_activation_time: Timestamp | None = None
            last_activation_time: Timestamp | None = None

            first_activation_time_by_previous_activity: Dict[str, Timestamp] = {}
            last_activation_time_by_previous_activity: Dict[str, Timestamp] = {}

            # Determine the first and the last activation time for the object type.
            for object_id in event[object_type]:
                if event_id not in aligned_times[object_type] or object_id not in aligned_times[object_type][event_id]:
                    continue  # This event is log move for this object.

                aligned_time = AlignedEdgeTimes(*aligned_times[object_type][event_id][object_id])
                execution_time = ProjectedEventTime(*aligned_time.execution_time)
                execution_timestamp = Timestamp(ts_input=execution_time.aligned_time)
                assert execution_timestamp == event_start_timestamp

                if aligned_time.activation_time and aligned_time.previous_activity:
                    activation_time = ProjectedEventTime(*aligned_time.activation_time)
                    activation_timestamp = Timestamp(ts_input=activation_time.aligned_time)

                    has_model_moves_inbetween = activation_time.model_move_counter != execution_time.model_move_counter
                    if has_model_moves_inbetween:
                        continue  # We ignore transitions have model-moves inbetween.

                    if first_activation_time is None or activation_timestamp < first_activation_time:
                        first_activation_time = activation_timestamp
                    if last_activation_time is None or activation_timestamp > last_activation_time:
                        last_activation_time = activation_timestamp

                    if aligned_time.previous_activity not in first_activation_time_by_previous_activity or \
                            activation_timestamp < first_activation_time_by_previous_activity[
                        aligned_time.previous_activity]:
                        first_activation_time_by_previous_activity[
                            aligned_time.previous_activity] = activation_timestamp
                    if aligned_time.previous_activity not in last_activation_time_by_previous_activity or \
                            activation_timestamp > last_activation_time_by_previous_activity[
                        aligned_time.previous_activity]:
                        last_activation_time_by_previous_activity[aligned_time.previous_activity] = activation_timestamp

                    if event_first_activation is None or activation_timestamp < event_first_activation:
                        event_first_activation = activation_timestamp

            if first_activation_time is not None:
                ot_first_activation_times[object_type] = first_activation_time

            if first_activation_time is not None and last_activation_time is not None:
                pooling_time = last_activation_time - first_activation_time
                pooling_times.setdefault(event_activity, {}).setdefault(object_type, []).append(
                    round(pooling_time.total_seconds()))
                # Calculate and store the edge times.
                for previous_activity in first_activation_time_by_previous_activity:
                    edge_pooling_time = last_activation_time_by_previous_activity[previous_activity] - \
                                        first_activation_time_by_previous_activity[previous_activity]
                    edge_pooling_times \
                        .setdefault(previous_activity, {}) \
                        .setdefault(event_activity, {}) \
                        .setdefault(object_type, []) \
                        .append(round(edge_pooling_time.total_seconds()))

                    edge_waiting_time = event_start_timestamp - last_activation_time_by_previous_activity[
                        previous_activity]
                    edge_waiting_times \
                        .setdefault(previous_activity, {}) \
                        .setdefault(event_activity, {}) \
                        .setdefault(object_type, []) \
                        .append(round(edge_waiting_time.total_seconds()))

                ot_activation_times.append(last_activation_time)

        for object_type in ot_first_activation_times:
            lagging_time = ot_first_activation_times[object_type] - event_first_activation
            lagging_times.setdefault(event_activity, {}).setdefault(object_type, []).append(
                    round(lagging_time.total_seconds()))
        if len(ot_activation_times) > 0:
            first_ot_activation_time = min(ot_activation_times)
            last_ot_activation_time = max(ot_activation_times)

            waiting_time = event_start_timestamp - last_ot_activation_time
            sojourn_time = waiting_time + service_time
            # lagging_time = last_ot_activation_time - first_ot_activation_time
            
            synchronization_time = last_ot_activation_time - event_first_activation
            flow_time = synchronization_time + sojourn_time

            waiting_times.setdefault(event_activity, []).append(round(waiting_time.total_seconds()))
            sojourn_times.setdefault(event_activity, []).append(round(sojourn_time.total_seconds()))
            # lagging_times.setdefault(event_activity, []).append(round(lagging_time.total_seconds()))
            synchronization_times.setdefault(event_activity, []).append(round(synchronization_time.total_seconds()))
            flow_times.setdefault(event_activity, []).append(round(flow_time.total_seconds()))

        service_times.setdefault(event_activity, []).append(round(service_time.total_seconds()))

    return CollectedTimes(
        waiting_times=waiting_times,
        service_times=service_times,
        sojourn_times=sojourn_times,
        pooling_times=pooling_times,
        synchronization_times=synchronization_times,
        lagging_times=lagging_times,
        flow_times=flow_times,
        edge_pooling_times=edge_pooling_times,
        edge_waiting_times=edge_waiting_times
    )


def aggregate_times_to_frontend_friendly(collected_times: CollectedTimes) -> FrontendFriendlyPerformanceMetrics:
    def aggregate(times: List[int]) -> AggregatedMetric:
        if len(times) == 0:
            raise ValueError()
        times.sort()
        min_time, median_time, max_time = times[0], times[len(times) // 2], times[-1]
        time_sum = sum(times)
        average_time = round(time_sum / len(times))
        standard_deviation = math.sqrt(sum([(t - average_time) ** 2 for t in times]) / len(times))
        return AggregatedMetric(min=min_time,
                                median=median_time,
                                max=max_time,
                                mean=average_time,
                                stdev=standard_deviation,
                                sum=time_sum)

    def get_aggegated_node_metric_if_available(metrics: Dict[Node, List[int]], node: Node) -> AggregatedMetric | None:
        if node in metrics:
            return aggregate(metrics[node])
        return None

    service_times = collected_times.service_times
    waiting_times = collected_times.waiting_times
    sojourn_times = collected_times.sojourn_times
    lagging_times = collected_times.lagging_times
    synchronization_times = collected_times.synchronization_times
    flow_times = collected_times.flow_times
    pooling_times = collected_times.pooling_times
    edge_pooling_times = collected_times.edge_pooling_times
    edge_waiting_times = collected_times.edge_waiting_times

    node_metrics: Dict[Node, NodePerformanceMetrics] = {}
    for node in service_times:
        service_time: AggregatedMetric = aggregate(service_times[node])

        waiting_time: AggregatedMetric | None = get_aggegated_node_metric_if_available(waiting_times, node)
        sojourn_time: AggregatedMetric | None = get_aggegated_node_metric_if_available(sojourn_times, node)
        # lagging_time: AggregatedMetric | None = get_aggegated_node_metric_if_available(lagging_times, node)
        synchronization_time: AggregatedMetric | None = get_aggegated_node_metric_if_available(synchronization_times,
                                                                                               node)
        flow_time: AggregatedMetric | None = get_aggegated_node_metric_if_available(flow_times, node)
        node_pooling_times: Dict[ObjectType, AggregatedMetric] = {}
        if node in pooling_times:
            node_pooling_times = {object_type: aggregate(times) for (object_type, times) in pooling_times[node].items()}
        node_lagging_times: Dict[ObjectType, AggregatedMetric] = {}
        if node in lagging_times:
            node_lagging_times = {object_type: aggregate(times) for (object_type, times) in lagging_times[node].items()}

        node_metrics[node] = NodePerformanceMetrics(service_time=service_time,
                                                    waiting_time=waiting_time,
                                                    sojourn_time=sojourn_time,
                                                    lagging_times=node_lagging_times,
                                                    synchronization_time=synchronization_time,
                                                    flow_time=flow_time,
                                                    pooling_times=node_pooling_times)

    edge_metrics: Dict[Node, Dict[Node, Dict[ObjectType, EdgePerformanceMetrics]]] = {}
    for source in edge_pooling_times:
        for target in edge_pooling_times[source]:
            for object_type in edge_pooling_times[source][target]:
                edge_metrics.setdefault(source, {}).setdefault(target, {})[object_type] = EdgePerformanceMetrics(
                    pooling_time=aggregate(edge_pooling_times[source][target][object_type]),
                    waiting_time=aggregate(edge_waiting_times[source][target][object_type])
                )

    return FrontendFriendlyPerformanceMetrics(nodes=node_metrics, edges=edge_metrics)
# endregion


# region Legacy performance metrics
@app.task()
def calculate_performance_metrics(base_ocel: str, object_type: str, alignments: List[Dict[str, Any]]):
    log_cases = extract_cases_with_timestamps(get_projected_event_log(base_ocel, object_type))
    aligned_log = align_log(log_cases, alignments)
    metrics, _, _ = pm4py.discover_performance_dfg(aligned_log)
    return {
        "edges": expand_tuple_keys(metrics)
    }


def extract_cases_with_timestamps(log: EventLog) -> Dict[str, List[Tuple[str, datetime]]]:
    log: DataFrame = pm4py.convert_to_dataframe(log)

    log_cases: Dict[str, List[Tuple[str, datetime]]] = {}
    for _, row in log.iterrows():
        log_cases.setdefault(row['case:concept:name'], []).append((row['concept:name'], row['time:timestamp']))

    return log_cases


def align_log(log_cases: Dict[str, List[Tuple[str, datetime]]], alignments: List[Dict[str, Any]]) -> DataFrame:
    alignments_dict = preprocess_alignments(alignments)

    current_case_id = 0
    aligned_case_ids = []
    aligned_activities = []
    aligned_timestamps = []
    for case in log_cases.values():
        current_case_id += 1

        alignment = alignments_dict[tuple([step[0] for step in case])]
        case_position = 0
        for (log_move, model_move) in zip(alignment.log_alignment, alignment.model_alignment):
            log_move: str = log_move.activity
            model_move: str = model_move.activity

            if log_move == START_TOKEN or log_move == STOP_TOKEN:
                continue

            if model_move == SKIP_MOVE:
                # Log-moves are ignored.
                case_position += 1
                continue

            if log_move == SKIP_MOVE:
                # Start a new aligned trace on log moves since there is no data for the newly added edges.
                current_case_id += 1
                # Both edges, to and from the model-move-activity, are ignored.
                continue

            assert log_move == model_move
            aligned_case_ids.append(str(current_case_id))
            aligned_activities.append(log_move)
            aligned_timestamps.append(case[case_position][1])
            case_position += 1

    return DataFrame({'case:concept:name': aligned_case_ids, 'concept:name': aligned_activities,
                      'time:timestamp': aligned_timestamps},
                     columns=['case:concept:name', 'concept:name', 'time:timestamp'])


def preprocess_alignments(alignments: List[Dict[str, Any]]) -> Dict[Any, TraceAlignment]:
    alignments_dict: Dict[Any, TraceAlignment] = {}
    for alignment in alignments:
        alignment = TraceAlignment(**alignment)
        log_trace = tuple([step.activity for step in alignment.log_alignment if step.activity != SKIP_MOVE][1:-1])
        alignments_dict[log_trace] = alignment
    return alignments_dict


def expand_tuple_keys(metrics: Dict[Tuple[str, str], Dict[str, float]]) -> Dict[str, Dict[str, Dict[str, float]]]:
    result = {}
    for ((activity1, activity2), edge_metrics) in metrics.items():
        # If there is only one trace going through an edge, the standard-deviation
        if isnan(edge_metrics['stdev']):
            edge_metrics['stdev'] = 0
        result.setdefault(activity1, {})[activity2] = edge_metrics
    return result

# endregion
