from collections import namedtuple
from pathlib import PureWindowsPath
from typing import List, Tuple, NamedTuple

from pydantic import BaseModel

from cache import get_long_term_cache, dfm as dfm_cache_key
from server import task_manager
from shared_types import FrontendFriendlyDFM, FrontendFriendlyNode, FrontendFriendlyEdge
from worker.main import app
from worker.tasks.dfm import START_TOKEN, STOP_TOKEN
from worker.utils import get_projected_event_log

from pm4py import conformance_diagnostics_alignments, view_petri_net
from pm4py.objects.petri_net.utils.initial_marking import discover_initial_marking
from pm4py.objects.petri_net.utils.final_marking import discover_final_marking
from pm4py.objects.petri_net.utils.check_soundness import check_wfnet
from pm4py.objects.petri_net.utils.petri_utils import PetriNet, add_place, add_transition, add_arc_from_to

Edge = namedtuple("Edge", ['source', 'target'])

class FilteredDFG(BaseModel):
    nodes: List[str]
    edges: List[Edge]

@app.task()
def compute_alignments(process_ocel: str, ocel_filename_conformance: str, threshold: float, object_type: str):
    # TODO:
    process_ocel = PureWindowsPath(process_ocel).as_posix()
    ocel_filename_conformance = PureWindowsPath(ocel_filename_conformance).as_posix()

    long_term_cache = get_long_term_cache()
    print(f"CACHE HAS DFM: {long_term_cache.has(process_ocel, dfm_cache_key())}")
    dfm = FrontendFriendlyDFM(**long_term_cache.get(process_ocel, dfm_cache_key()))
    dfg = filter_threshold_of_graph_notation(dfm, object_type, threshold)

    projected_log = get_projected_event_log(ocel_filename_conformance, object_type)
    petrinet, initial_marking, final_marking = build_petrinet(dfg)

    aligned_traces = conformance_diagnostics_alignments(projected_log, petrinet, initial_marking, final_marking)

    return aligned_traces


def filter_threshold_of_graph_notation(dfm: FrontendFriendlyDFM, object_type: str, filter_threshold: float) -> FilteredDFG:
    # in nodes, edges in subgraphs threshold attribute is value at which the element starts to be included

    nodes = []
    node_indices = {}
    current_idx = 0
    for (i, node) in enumerate(dfm.nodes):
        if object_type in node.counts and filter_threshold >= node.counts[object_type][0][0]:
            nodes.append(node.label)
            node_indices[i] = current_idx
            current_idx += 1

    edges = [
        Edge(node_indices[edge.source], node_indices[edge.target])
        for edge in dfm.subgraphs[object_type] if filter_threshold >= edge.counts[0][0]
    ]

    return FilteredDFG(nodes=nodes, edges=edges)


def node_selection_from_edges(all_nodes, edges: List[FrontendFriendlyEdge]):
    selection = set()
    for edge in edges:
        selection.add(edge.source)
        selection.add(edge.target)
    return selection


def build_petrinet(dfg):
    net = PetriNet()

    # "A place for each node ∈ N (this includes places belonging to start and end)"
    places = {}
    start_place = None
    end_place = None
    for (i, node) in enumerate(dfg.nodes):
        if node == START_TOKEN:
            start_place = add_place(net)
            places[i] = start_place
            continue
        elif node == STOP_TOKEN:
            end_place = add_place(net)
            places[i] = end_place
            continue

        places[i] = add_place(net, name=node)

    assert(start_place is not None and end_place is not None)

    # "For each edge (s, t) ∈ E, a subgraph connecting the place belonging to s to the place belonging to t.
    # This subgraph depends on whether t is end. If t is end, then this subgraph is a silent transition
    # connecting s to t. If t is not end, then this subgraph executes ts and tc in sequence, where ts is optional.
    for edge in dfg.edges:
        s = places[edge.source]
        t = places[edge.target]

        if t == end_place:
            add_empty_connected_transition(s, t, net)
        else:
            # we introduce optional transition for start of event, although we currently only handle data
            # containing only event completions
            target_label = dfg.nodes[edge.target]
            start_label = f"[START]-{target_label}"
            end_label = f"{target_label}"

            intermediate_place = add_place(net)
            add_optional_connected_transition(s, intermediate_place, start_label, start_label, net)
            add_connected_transition(intermediate_place, t, end_label, end_label, net)

    initial_marking = discover_initial_marking(net)
    final_marking = discover_final_marking(net)
    # checks if unique source, unique sink exist and if all places are reachable from source and can reach sink
    assert(check_wfnet(net))

    return net, initial_marking, final_marking


def add_empty_connected_transition(source, target, net):
    add_connected_transition(source, target, None, None, net)


def add_connected_transition(source, target, name, label, net):
    trans = add_transition(net, name=name, label=label)
    _ = add_arc_from_to(source, trans, net)
    _ = add_arc_from_to(trans, target, net)


def add_optional_connected_transition(source, target, name, label, net):
    add_empty_connected_transition(source, target, net)
    add_connected_transition(source, target, name, label, net)
