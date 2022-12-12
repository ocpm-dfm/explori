from collections import namedtuple
from typing import Dict, List, Tuple
from pathlib import PureWindowsPath

from worker.main import app
from worker.utils import get_all_projected_traces

Edge = namedtuple('Edge', ['source', 'target'])
Node = str
ObjectType = str
Trace = namedtuple("Trace", ['actions', 'trace_count'])
CountSeperator = namedtuple("CountSeperator", ["upper_bound", "instance_count"])

START_TOKEN = "|EXPLORI_START|"
STOP_TOKEN = "|EXPLORI_END|"


@app.task()
def dfm(ocel_filename: str):
    # At least for development the backend can potentially run on Windows in which case `ocel_filename` is a Windows
    # path as it was constructed using `os.path` functionality (which just operates on strings).
    # Because Celery has no official support for Windows, we assume it will be run on a POSIX compatible platform.
    # This means `ocel_filename` needs to be translated from a Windows path or a POSIX path to a POSIX path.
    # The following transformation has no effect if `ocel_filename` is already a POSIX path.
    ocel_filename = PureWindowsPath(ocel_filename).as_posix()

    projected_traces: Dict[ObjectType, List[Tuple[List[str], int]]] = get_all_projected_traces(ocel_filename,
                                                                                        build_if_non_existent=True)

    edge_counts: Dict[ObjectType, Dict[Edge, List[CountSeperator]]] = {}
    node_counts_by_object_type: Dict[ObjectType, Dict[Node, List[CountSeperator]]] = {}
    edge_thresholds: Dict[ObjectType, Dict[Edge, float]] = {}

    for object_type in projected_traces:
        edge_totals, node_totals, edge_traces, total_objects = prepare_dfg_computation(projected_traces[object_type])

        type_edge_counts, type_node_counts = \
            calculate_threshold_counts_on_dfg(edge_totals, node_totals, edge_traces, total_objects)

        edge_counts[object_type] = type_edge_counts
        node_counts_by_object_type[object_type] = type_node_counts
        edge_thresholds[object_type] = {edge: type_edge_counts[edge][0].upper_bound for edge in type_edge_counts}

    node_counts = combine_node_counts(node_counts_by_object_type)
    node_thresholds = {node: node_counts[node][0].upper_bound for node in node_counts}

    return convert_to_frontend_friendly_graph_notation(edge_thresholds, node_thresholds,
                                                       edge_counts, node_counts)


def prepare_dfg_computation(traces: List[Trace]) -> (
        Dict[Edge, int],
        Dict[Node, int], Dict[Edge, List[Trace]],
        int):
    #edge := (sourceNode: str, targetNode: str)
    # edge_counts := edge -> <nr of objects passing through that edge>: int
    # node_counts := node -> <nr of objects passing through that node>: int
    # edge_traces := edge -> [(trace: [nodes: str], <frequency of the trace>: int)]
    # total_objects := <the total number of objects>: int
    edge_counts: Dict[Edge, int] = {}
    node_counts: Dict[Node, int] = {}
    edge_traces: Dict[Edge, List[Trace]] = {}
    total_objects = 0

    for (variant, count_of_cases) in traces:
        # Wrap the trace by a start and a stop token so traces of length 1 are handled correctly.
        variant = [START_TOKEN] + list(variant) + [STOP_TOKEN]
        total_objects += count_of_cases
        trace_tuple = Trace(variant, count_of_cases)

        seen_edges = set()

        for i in range(len(variant) - 1):
            edge = Edge(variant[i], variant[i + 1])

            edge_counts.setdefault(edge, 0)
            edge_counts[edge] += count_of_cases

            # An edge might repeat itself within a trace. We don't want the trace to be added twice.
            if edge not in seen_edges:
                edge_traces.setdefault(edge, []).append(trace_tuple)
                seen_edges.add(edge)

        for node in variant:
            node_counts.setdefault(node, 0)
            node_counts[node] += count_of_cases

    return edge_counts, node_counts, edge_traces, total_objects


def calculate_threshold_counts_on_dfg(edge_totals: Dict[Edge, int], node_totals: Dict[Node, int],
                                      edge_traces: Dict[Edge, List[Trace]], total_objects: int) -> (
    Dict[Edge, List[CountSeperator]],
    Dict[Node, List[CountSeperator]]):
    edges = sorted(list(edge_totals.keys()), key=lambda edge: edge_totals[edge])

    current_objects = total_objects
    edge_counts: Dict[Edge, List[CountSeperator]] = { edge: [CountSeperator(1.01, edge_totals[edge])] for edge in edges }
    node_counts: Dict[Node, List[CountSeperator]] = { node: [CountSeperator(1.01, node_totals[node])] for node in node_totals }

    for edge in edges:
        updated_edge_counts: Dict[Edge, int] = {}
        updated_node_counts: Dict[Node, int] = {}

        for trace in edge_traces[edge]:
            actions: List[Node] = trace.actions
            count: int = trace.trace_count
            seen_steps = set()

            for i in range(len(actions) - 1):
                other_edge = Edge(actions[i], actions[i + 1])

                updated_edge_counts.setdefault(other_edge, edge_counts[other_edge][0].instance_count)
                updated_edge_counts[other_edge] -= count

                # We must not remove the trace from edge_traces[edge] because we are currently iterating through it.
                # Also, an edge might occur twice in a single trace (e.g. "a, a, a"), so we must ensure that we don't
                # remove it twice.
                if other_edge != edge and other_edge not in seen_steps:
                    edge_traces[other_edge].remove(trace)
                    seen_steps.add(other_edge)

            for node in actions:
                updated_node_counts.setdefault(node, node_counts[node][0].instance_count)
                updated_node_counts[node] -= count

            current_objects -= count

        threshold = current_objects / total_objects
        for other_edge in updated_edge_counts:
            edge_counts[other_edge].insert(0, CountSeperator(threshold, updated_edge_counts[other_edge]))
        for node in updated_node_counts:
            node_counts[node].insert(0, CountSeperator(threshold, updated_node_counts[node]))

    return edge_counts, node_counts

def combine_node_counts(object_type_node_counts: Dict[ObjectType, Dict[Node, List[CountSeperator]]]) -> Dict[Node, List[CountSeperator]]:
    result: Dict[Node, List[CountSeperator]] = {}
    for type_counts in object_type_node_counts.values():
        for node, node_counts in type_counts.items():
            result.setdefault(node, [])
            result_counts = result[node]

            last_added_count = 0
            for seperator_to_insert in node_counts:
                for i in range(len(result_counts)):
                    if result_counts[i].upper_bound < seperator_to_insert.upper_bound:
                        continue

                    count_increase = seperator_to_insert.instance_count - last_added_count
                    last_added_count = seperator_to_insert.instance_count

                    if result_counts[i].upper_bound == seperator_to_insert.upper_bound:
                        for j in range(i, len(result_counts)):
                            result_counts[j] = increase_count(result_counts[j], count_increase)
                        break

                    for j in range(i, len(result_counts)):
                        result_counts[j] = increase_count(result_counts[j], count_increase)
                    if i == 0:
                        result_counts.insert(i, seperator_to_insert)
                    else:
                        result_counts.insert(i, CountSeperator(seperator_to_insert.upper_bound,
                                                               result_counts[i - 1].instance_count + count_increase))
                    break
                else:
                    result_counts.append(seperator_to_insert)

    return result


def compute_node_thresholds(node_counts: Dict[ObjectType, Dict[Node, List[CountSeperator]]]) -> Dict[Node, float]:
    # Step 3: Calculate node thresholds
    node_thresholds: Dict[str, float] = {}

    for counts in node_counts.values():
        for node, c in counts.items():
            ot_thresh = c[0].upper_bound
            node_thresholds.setdefault(node, ot_thresh)
            if node_thresholds[node] > ot_thresh:
                node_thresholds[node] = ot_thresh
    return node_thresholds


def convert_to_frontend_friendly_graph_notation(edge_thresholds: Dict[ObjectType, Dict[Edge, float]],
                                                node_thresholds: Dict[Node, float],
                                                edge_counts: Dict[str, Dict[Edge, List[CountSeperator]]],
                                                node_counts: Dict[Node, List[CountSeperator]]):
    # Step 4: Generate frontend-friendly output
    node_indices: Dict[str, int] = {
        START_TOKEN: 0,
        STOP_TOKEN: 1
    }
    for node in node_thresholds.keys():
        node_indices.setdefault(node, len(node_indices))
    frontend_nodes = [{} for _ in range(len(node_indices))]
    for node in node_thresholds.keys():
        frontend_nodes[node_indices[node]] = {
            'label': node,
            'threshold': node_thresholds[node],
            'counts': node_counts[node]
        }

    frontend_subgraphs: Dict[str, List[Dict[str, float]]] = \
    {
        object_type:
        [
            {
                'source': node_indices[edge.source],
                'target': node_indices[edge.target],
                'threshold': edge_thresholds[object_type][edge],
                'counts': edge_counts[object_type][edge]
            }
            for edge in edge_thresholds[object_type]
        ]
        for object_type in edge_thresholds
    }

    return {
        'nodes': frontend_nodes,
        'subgraphs': frontend_subgraphs
    }


def increase_count(seperator: CountSeperator, count: int):
    return CountSeperator(seperator.upper_bound, seperator.instance_count + count)
