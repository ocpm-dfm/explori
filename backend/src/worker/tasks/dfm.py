from collections import namedtuple
from typing import Dict, List, Tuple, Generator
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
    node_counts: Dict[ObjectType, Dict[Node, List[CountSeperator]]] = {}
    trace_thresholds: Dict[ObjectType, Dict[Tuple[Node], Tuple[int, float]]] = {}

    for object_type in projected_traces:
        edge_totals, node_totals, edge_traces, total_objects = prepare_dfg_computation(projected_traces[object_type])

        type_edge_counts, type_node_counts, type_trace_thresholds = \
            calculate_threshold_counts_on_dfg(edge_totals, node_totals, edge_traces, total_objects)

        edge_counts[object_type] = type_edge_counts
        node_counts[object_type] = type_node_counts
        trace_thresholds[object_type] = type_trace_thresholds

    return convert_to_frontend_friendly_graph_notation(edge_counts, node_counts, trace_thresholds)


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
    trace_thresholds: Dict[Tuple[Node], Tuple[int, float]] = {}

    for edge in edges:
        updated_edge_counts: Dict[Edge, int] = {}
        updated_node_counts: Dict[Node, int] = {}
        removed_traces: List[Trace] = []

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
            removed_traces.append(trace)

        threshold = current_objects / total_objects
        for other_edge in updated_edge_counts:
            edge_counts[other_edge].insert(0, CountSeperator(threshold, updated_edge_counts[other_edge]))
        for node in updated_node_counts:
            node_counts[node].insert(0, CountSeperator(threshold, updated_node_counts[node]))
        for trace in removed_traces:
            trace_thresholds[tuple(trace.actions)] = (trace.trace_count, threshold)

    return edge_counts, node_counts, trace_thresholds


def convert_to_frontend_friendly_graph_notation(edge_counts: Dict[ObjectType, Dict[Edge, List[CountSeperator]]],
                                                node_counts: Dict[ObjectType, Dict[Node, List[CountSeperator]]],
                                                trace_thresholds: Dict[ObjectType, Dict[Tuple[Node], Tuple[int, float]]]):
    # Step 1: Build node indices.
    node_indices: Dict[str, int] = {
        START_TOKEN: 0,
        STOP_TOKEN: 1
    }
    nodes = set(sum([list(node_counts[object_type].keys()) for object_type in node_counts], start=[]))
    for node in nodes:
        node_indices.setdefault(node, len(node_indices))

    # Step 2: Build frontend traces, store trace indices for edges and nodes. We also use the loop over all occurring
    # thresholds to build the threshold boxes.
    seen_traces = set()
    frontend_traces = []
    node_traces: Dict[Node, List[int]] = {}
    edge_traces: Dict[Tuple[ObjectType, Node, Node], List[int]] = {}

    all_occurring_thresholds = set()

    for traces in trace_thresholds.values():
        for trace in traces:
            if trace in seen_traces:
                continue
            seen_traces.add(trace)

            trace_index = len(frontend_traces)

            trace_object_types = {
                object_type for object_type in trace_thresholds if trace in trace_thresholds[object_type]
            }

            frontend_traces.append({
                "actions": [node_indices[node] for node in trace],
                "thresholds": {
                    object_type: {
                        "count": trace_thresholds[object_type][trace][0],
                        "threshold": trace_thresholds[object_type][trace][1]
                    }
                    for object_type in trace_object_types
                }
            })

            thresholds_set = { trace_thresholds[object_type][trace][1] for object_type in trace_object_types }
            all_occurring_thresholds.update(thresholds_set)

            seen_nodes = set()
            for node in trace:
                if node not in seen_nodes:
                    node_traces.setdefault(node, []).append(trace_index)
                    seen_nodes.add(node)

            seen_edges = set()
            for (source, target) in steps(trace):
                for object_type in trace_object_types:
                    edge = (object_type, source, target)
                    if edge not in seen_edges:
                        edge_traces.setdefault(edge, []).append(trace_index)
                        seen_edges.add(edge)

    # Step 3: Build frontend nodes.
    frontend_nodes = [{} for _ in range(len(node_indices))]
    for node in nodes:
        counts: Dict[ObjectType, List[CountSeperator]] = {
            object_type: node_counts[object_type][node]
            for object_type in node_counts
            if node in node_counts[object_type]
        }

        frontend_nodes[node_indices[node]] = {
            'label': node,
            'counts': counts,
            'traces': node_traces[node]
        }

    # Step 4: Build frontend edges, seperated by object type.
    frontend_subgraphs: Dict[str, List[Dict[str, float]]] = \
    {
        object_type:
        [
            {
                'source': node_indices[edge.source],
                'target': node_indices[edge.target],
                'counts': edge_counts[object_type][edge],
                'traces': edge_traces[object_type, edge.source, edge.target]
            }
            for edge in edge_counts[object_type]
        ]
        for object_type in edge_counts
    }

    threshold_boxes = sorted(list(all_occurring_thresholds))

    return {
        'thresholds': threshold_boxes,
        'traces': frontend_traces,
        'nodes': frontend_nodes,
        'subgraphs': frontend_subgraphs
    }


def increase_count(seperator: CountSeperator, count: int):
    return CountSeperator(seperator.upper_bound, seperator.instance_count + count)


def steps(trace: List[Node] | Tuple[Node]) -> Generator[Tuple[Node, Node], None, None]:
    for i in range(len(trace) - 1):
        yield (trace[i], trace[i + 1])
