from datetime import datetime
from typing import Dict, Any, List, Tuple

import pm4py
from pandas import DataFrame
from pm4py.objects.log.obj import EventLog

from worker.main import app
from worker.tasks.alignments import TraceAlignment, SKIP_MOVE
from worker.tasks.dfm import START_TOKEN, STOP_TOKEN
from worker.utils import get_projected_event_log


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
    alignments_dict: Dict[Any, TraceAlignment] = {}
    for alignment in alignments:
        alignment = TraceAlignment(**alignment)
        log_trace = tuple([step.activity for step in alignment.log_alignment if step.activity != SKIP_MOVE][1:-1])
        alignments_dict[log_trace] = alignment

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

    return DataFrame({ 'case:concept:name': aligned_case_ids, 'concept:name': aligned_activities, 'time:timestamp': aligned_timestamps },
                            columns=['case:concept:name', 'concept:name', 'time:timestamp'])



def expand_tuple_keys(metrics: Dict[Tuple[str, str], Dict[str, float]]) -> Dict[str, Dict[str, Dict[str, float]]]:
    result = {}
    for ((activity1, activity2), edge_metrics) in metrics.items():
        result.setdefault(activity1, {})[activity2] = edge_metrics
    return result