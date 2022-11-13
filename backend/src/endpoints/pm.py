import os.path
from typing import Dict, Tuple, List, Set, Any

import pm4py
from fastapi import HTTPException, APIRouter, Query, Depends
from ocpa.algo.util.util import project_log
from ocpa.objects.log.importer.csv.util import succint_mdl_to_exploded_mdl
from ocpa.objects.log.ocel import OCEL
from pandas import DataFrame
from pm4py.objects.log.obj import EventLog
from pydantic import BaseModel
from starlette import status
from ocpa.objects.log.importer.ocel import factory as ocel_import_factory

from cache import ExploriCache, get_cache, dfm

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
    nodes: List[DFMNodeResponseModel]
    subgraphs: Dict[str, List[DFMEdgeResponseModel]]

    class Config:
        pass # TODO: Create example output


@router.get('/dfm', response_model=DFMResponseModel)
def calculate_dfm_with_thresholds(file: str = Query(example="uploaded/p2p-normal.jsonocel"),
                                  cache: ExploriCache = get_cache()):
    """
    Tries to load the given OCEL from the data folder, calculates the DFM and the threshold associated with
    each edge and node.
    """

    if dfm() in cache:
        return cache.get(dfm())

    # SECURITY: Prevent path traversal trickery.
    abs_file = os.path.abspath(os.path.join("data", file))
    if abs_file[-len(file):] != file:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="The file must not contain any path traversals.")
    if not os.path.isfile(abs_file):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The specified file does not exist.")

    ocel: OCEL = ocel_import_factory.apply(abs_file)
    # Prepare event log for projection to object types.
    df: DataFrame = ocel.log.log
    exploded_df = succint_mdl_to_exploded_mdl(df)

    # The DFM data structure we will use for filtering.
    # edge = (sourceNode: str, targetNode: str, objectType: str)
    edge_counts: Dict[Tuple[str, str, str], int] = {}
    node_counts: Dict[str, int] = {}
    # edge -> [(trace, trace_count)]
    edge_traces: Dict[Tuple[str, str, str], List[Tuple[List[str], int]]] = {}
    total_objects = 0

    # Step 1: Build DFM.
    for object_type in ocel.object_types:

        projected: EventLog = project_log(exploded_df, object_type)
        variants = pm4py.get_variants_as_tuples(projected)
        for (variant, cases) in variants.items():

            count_of_cases = len(cases)
            total_objects += count_of_cases
            trace_tuple = (variant, count_of_cases)

            print(object_type, variant, count_of_cases)

            for i in range(len(variant) - 1):
                edge = (variant[i], variant[i + 1], object_type)

                edge_counts.setdefault(edge, 0)
                edge_counts[edge] += count_of_cases
                edge_traces.setdefault(edge, []).append(trace_tuple)

            for node in variant:
                node_counts.setdefault(node, 0)
                node_counts[node] += count_of_cases

    # Step 2: Determine thresholds for every edge and the amount that each edge / node occurs.
    # Sort edges from least frequent to most frequent
    edges = sorted(list(edge_counts.keys()), key=lambda edge: edge_counts[edge])

    current_objects = total_objects
    edge_thresholds: Dict[Tuple[str, str, str], float] = {}

    # edge / node -> (threshold at which count is reached, count)
    # Assume we have a list [ ..., (t_a, c_a), (t_b, c_b), ... ],
    # and our threshold t fits t_a <= t < t_b, then the count of at that node / edge is c_b!
    edge_counts_by_threshold: Dict[Tuple[str, str, str], List[(float, int)]] = {
        edge: [(1.01, edge_counts[edge])] for edge in edges  # 1.01 because the upper end is exclusive and 1 should be in range.
    }
    node_counts_by_threshold: Dict[str, List[(float, int)]] = {
        node: [(1.01, node_counts[node])] for node in node_counts.keys()  # 1.01 because the upper end is exclusive and 1 should be in range.
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
            'threshold': node_thresholds[node],
            'counts': node_counts_by_threshold[node]
        })

    frontend_subgraphs: Dict[str, List[Dict[str, float]]] = {}
    for edge in edges:
        frontend_edge = {
            'source': node_indices[edge[0]],
            'target': node_indices[edge[1]],
            'threshold': edge_thresholds[edge],
            'counts': edge_counts_by_threshold[edge]
        }

        frontend_subgraphs.setdefault(edge[2], []).append(frontend_edge)

    frontend_dfm = {
        'nodes': frontend_nodes,
        'subgraphs': frontend_subgraphs
    }

    cache[dfm()] = frontend_dfm

    return frontend_dfm
# endregion
