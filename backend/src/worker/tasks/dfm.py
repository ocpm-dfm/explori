from typing import Dict, List, Tuple
from pathlib import PureWindowsPath

from worker.main import app
from worker.utils import get_all_projected_traces


@app.task()
def dfm(ocel_filename: str):
    # At least for development the backend can potentially run on Windows in which case `ocel_filename` is a Windows
    # path as it was constructed using `os.path` functionality (which just operates on strings).
    # Because Celery has no official support for Windows, we assume it will be run on a POSIX compatible platform.
    # This means `ocel_filename` needs to be translated from a Windows path or a POSIX path to a POSIX path.
    # The following transformation has no effect if `ocel_filename` is already a POSIX path.
    ocel_filename = PureWindowsPath(ocel_filename).as_posix()

    projected_traces: Dict[str, List[Tuple[List[str], int]]] = get_all_projected_traces(ocel_filename,
                                                                                        build_if_non_existent=True)

    edge_counts, node_counts, edge_traces, total_objects = prepare_threshold_computation(projected_traces)

    edge_thresholds, edge_counts_by_threshold, node_counts_by_threshold = \
        compute_edge_thresholds_and_counts(edge_counts, node_counts, edge_traces, total_objects)

    node_thresholds = compute_node_thresholds(edge_thresholds)

    return convert_to_frontend_friendly_graph_notation(edge_thresholds, node_thresholds,
                                                       edge_counts_by_threshold, node_counts_by_threshold)


def prepare_threshold_computation(projected_traces: Dict[str, List[Tuple[List[str], int]]]) -> (
        Dict[Tuple[str, str, str], int],
        Dict[str, int],
        Dict[Tuple[str, str, str], List[Tuple[List[str], int]]],
        int):
    # The DFM data structure we will use for filtering.
    # edge := (sourceNode: str, targetNode: str, objectType: str)
    # edge_counts := edge -> <nr of objects passing through that edge>: int
    # node_counts := node -> <nr of objects passing through that node>: int
    # edge_traces := edge -> [(trace: [nodes: str], <frequency of the trace>: int)]
    # total_objects := <the total number of objects>: int
    edge_counts: Dict[Tuple[str, str, str], int] = {}
    node_counts: Dict[str, int] = {}
    # edge -> [(trace, trace_count)]
    edge_traces: Dict[Tuple[str, str, str], List[Tuple[List[str], int]]] = {}
    total_objects = 0

    # Step 1: Build DFM.
    for object_type in projected_traces.keys():

        for (variant, count_of_cases) in projected_traces[object_type]:

            total_objects += count_of_cases
            trace_tuple = (variant, count_of_cases)

            for i in range(len(variant) - 1):
                edge = (variant[i], variant[i + 1], object_type)

                edge_counts.setdefault(edge, 0)
                edge_counts[edge] += count_of_cases
                edge_traces.setdefault(edge, []).append(trace_tuple)

            for node in variant:
                node_counts.setdefault(node, 0)
                node_counts[node] += count_of_cases
    return edge_counts, node_counts, edge_traces, total_objects


def compute_edge_thresholds_and_counts(edge_counts: Dict[Tuple[str, str, str], int],
                                       node_counts: Dict[str, int],
                                       edge_traces: Dict[Tuple[str, str, str], List[Tuple[List[str], int]]],
                                       total_objects: int) -> (Dict[Tuple[str, str, str], float],
                                                               Dict[Tuple[str, str, str], List[Tuple[float, int]]],
                                                               Dict[str, List[Tuple[float, int]]]):
    # Step 2: Determine thresholds for every edge and the amount that each edge / node occurs.
    # Sort edges from least frequent to most frequent
    edges = sorted(list(edge_counts.keys()), key=lambda edge: edge_counts[edge])

    current_objects = total_objects
    edge_thresholds: Dict[Tuple[str, str, str], float] = {}

    # edge / node -> (threshold at which count is reached, count)
    # Assume we have a list [ ..., (t_a, c_a), (t_b, c_b), ... ],
    # and our threshold t fits t_a <= t < t_b, then the count of at that node / edge is c_b!
    edge_counts_by_threshold: Dict[Tuple[str, str, str], List[(float, int)]] = {
        edge: [(1.01, edge_counts[edge])] for edge in edges
        # 1.01 because the upper end is exclusive and 1 should be in range.
    }
    node_counts_by_threshold: Dict[str, List[(float, int)]] = {
        node: [(1.01, node_counts[node])] for node in node_counts.keys()
        # 1.01 because the upper end is exclusive and 1 should be in range.
    }

    for edge in edges:
        assert current_objects >= 0

        _, _, object_type = edge

        updated_edge_counts: Dict[Tuple[str, str, str], int] = {}
        updated_node_counts: Dict[str, int] = {}

        # Remove all traces that go through that edge.
        for trace_tuple in edge_traces[edge]:
            (trace, trace_count) = trace_tuple
            for i in range(len(trace) - 1):
                trace_step = (trace[i], trace[i + 1], object_type)
                edge_traces[trace_step].remove(trace_tuple)

                updated_edge_counts.setdefault(trace_step, edge_counts_by_threshold[trace_step][0][1])
                updated_edge_counts[trace_step] -= trace_count

            for node in trace:
                updated_node_counts.setdefault(node, node_counts_by_threshold[node][0][1])
                updated_node_counts[node] -= trace_count

            current_objects -= trace_count

        # Calculate threshold of the edge:
        current_threshold = current_objects / total_objects
        edge_thresholds[edge] = current_threshold

        # Update node_count_by_threshold and edge_count_by_threshold
        for (node, new_count) in updated_node_counts.items():
            node_counts_by_threshold[node].insert(0, (current_threshold, new_count))
        for (updated_edge, new_count) in updated_edge_counts.items():
            edge_counts_by_threshold[updated_edge].insert(0, (current_threshold, new_count))

    return edge_thresholds, edge_counts_by_threshold, node_counts_by_threshold


def compute_node_thresholds(edge_thresholds: Dict[Tuple[str, str, str], float]) -> Dict[str, float]:
    # Step 3: Calculate node thresholds
    node_thresholds: Dict[str, float] = {}

    def update_node_threshold(node: str, possible_threshold: float) -> None:
        if node not in node_thresholds:
            node_thresholds[node] = possible_threshold
        elif possible_threshold < node_thresholds[node]:
            node_thresholds[node] = possible_threshold

    for edge in edge_thresholds.keys():
        update_node_threshold(edge[0], edge_thresholds[edge])
        update_node_threshold(edge[1], edge_thresholds[edge])
    return node_thresholds


def convert_to_frontend_friendly_graph_notation(edge_thresholds: Dict[Tuple[str, str, str], float],
                                                node_thresholds: Dict[str, float],
                                                edge_counts_by_threshold: Dict[Tuple[str, str, str], List[Tuple[float, int]]],
                                                node_counts_by_threshold: Dict[str, List[Tuple[float, int]]]):
    # Step 4: Generate frontend-friendly output
    node_indices: Dict[str, int] = {}
    frontend_nodes = []
    for node in node_thresholds.keys():
        node_indices[node] = len(node_indices)
        frontend_nodes.append({
            'label': node,
            'threshold': node_thresholds[node],
            'counts': node_counts_by_threshold[node]
        })

    frontend_subgraphs: Dict[str, List[Dict[str, float]]] = {}
    for edge in edge_thresholds.keys():
        frontend_edge = {
            'source': node_indices[edge[0]],
            'target': node_indices[edge[1]],
            'threshold': edge_thresholds[edge],
            'counts': edge_counts_by_threshold[edge]
        }

        frontend_subgraphs.setdefault(edge[2], []).append(frontend_edge)

    return {
        'nodes': frontend_nodes,
        'subgraphs': frontend_subgraphs
    }
