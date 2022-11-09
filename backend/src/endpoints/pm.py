import os.path
from typing import Dict, Tuple, List, Set

import pm4py
from fastapi import HTTPException
from ocpa.algo.util.util import project_log
from ocpa.objects.log.importer.csv.util import succint_mdl_to_exploded_mdl
from ocpa.objects.log.ocel import OCEL
from pandas import DataFrame
from pm4py.objects.log.obj import EventLog
from starlette import status
from ocpa.objects.log.importer.ocel import factory as ocel_import_factory


from main import ENDPOINT_PREFIX, app


URI_PREFIX = ENDPOINT_PREFIX + 'pm/'


@app.get(URI_PREFIX + 'dfm')
def calculate_dfm_with_thresholds(file: str):
    # SECURITY: Prevent path traversal trickery.
    abs_file = os.path.abspath(os.path.join("data", file))
    if abs_file[-len(file):] != file:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The file must not contain any path traversals.")
    if not os.path.isfile(abs_file):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The specified file does not exist.")

    ocel: OCEL = ocel_import_factory.apply(abs_file)
    # Prepare event log for projection to object types.
    df: DataFrame = ocel.log.log
    exploded_df = succint_mdl_to_exploded_mdl(df)

    # The DFM data structure we will use for filtering.
    edge_counts: Dict[Tuple[str, str], int] = {}
    # edge -> [(trace, trace_count)]
    edge_traces: Dict[Tuple[str, str], List[Tuple[List[str], int]]] = {}
    # ege -> [object_type]
    edge_object_types: Dict[Tuple[str, str], Set[str]] = {}
    total_objects = 0

    # Step 1: Build DFM.
    for object_type in ocel.object_types:

        projected: EventLog = project_log(exploded_df, object_type)
        variants = pm4py.get_variants_as_tuples(projected)
        for (variant, cases) in variants.items():
            count_of_cases = len(cases)
            total_objects += count_of_cases
            trace_tuple = (variant, count_of_cases)

            for i in range(len(variant) - 1):
                edge = (variant[i], variant[i + 1])

                edge_counts.setdefault(edge, 0)
                edge_counts[edge] += count_of_cases
                edge_traces.setdefault(edge, []).append(trace_tuple)
                edge_object_types.setdefault(edge, set()).add(object_type)

    # Step 2: Determine thresholds for every edge.
    # Sort edges from least frequent to most frequent
    edges = sorted(list(edge_counts.keys()), key=lambda edge: edge_counts[edge])
    current_objects = total_objects
    edge_thresholds: Dict[Tuple[str, str], float] = {}

    for edge in edges:
        assert current_objects >= 0

        # Remove all traces that go through that edge.
        for trace_tuple in edge_traces[edge]:
            (trace, trace_count) = trace_tuple
            for i in range(len(trace) - 1):
                trace_step = (trace[i], trace[i + 1])
                edge_traces[trace_step].remove(trace_tuple)
            current_objects -= trace_count

        # Calculate threshold of the edge:
        edge_thresholds[edge] = current_objects / total_objects

    # Step 3: Calculate node thresholds
    node_thresholds: Dict[str, float] = {}

    def update_node_threshold(node: str, possible_threshold: float) -> None:
        if node not in node_thresholds:
            node_thresholds[node] = possible_threshold
        elif possible_threshold < node_thresholds[node]:
            node_thresholds[node] = possible_threshold

    for edge in edges:
        update_node_threshold(edge[0], edge_thresholds[edge])
        update_node_threshold(edge[1], edge_thresholds[edge])

    # Step 4: Generate frontend-friendly output
    node_indices: Dict[str, int] = {}
    frontend_nodes = []
    for node in node_thresholds.keys():
        node_indices[node] = len(node_indices)
        frontend_nodes.append({
            'label': node,
            'threshold': node_thresholds[node]
        })

    frontend_subgraphs: Dict[str, List[Dict[str, float]]] = {}
    for edge in edges:
        frontend_edge = {
            'source': node_indices[edge[0]],
            'target': node_indices[edge[1]],
            'threshold': edge_thresholds[edge]
        }

        for object_type in edge_object_types[edge]:
            frontend_subgraphs.setdefault(object_type, []).append(frontend_edge)

    frontend_dfm = {
        'nodes': frontend_nodes,
        'subgraphs': frontend_subgraphs
    }

    return frontend_dfm


PROCESS_MINING_ENDPOINTS_IMPORTED = True