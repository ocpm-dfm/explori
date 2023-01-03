import json
from collections import namedtuple
from enum import Enum
from pathlib import PureWindowsPath
from typing import List, Tuple, NamedTuple, Dict, Any, Literal
import operator as op

import pandas
from pm4py.objects.log.obj import EventLog
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
from pm4py.objects.conversion.log import converter as log_conv_factory


Edge = namedtuple("Edge", ['source', 'target'])

class FilteredDFG(BaseModel):
    nodes: List[str]
    edges: List[Edge]

SKIP_MOVE = ">>"

class AlignElement(BaseModel):
    activity: str | Literal[SKIP_MOVE]

class TraceAlignment(BaseModel):
    log_alignment: List[AlignElement]
    model_alignment: List[AlignElement]


def rearrange_and_deduplicate_alignments(aligned_traces: List[Dict[str, Any]]) -> List[TraceAlignment]:
    # TODO: deterministic ordering?

    deduplicated_traces = set()
    for trace in aligned_traces:
        alignment_info: List[Tuple[str, str | None]] = trace['alignment']
        deduplicated_traces.add(tuple(alignment_info))

    rearranged_traces: List[TraceAlignment] = []
    for trace in deduplicated_traces:
        alignment_log = map(op.itemgetter(0), trace)
        alignment_model = map(op.itemgetter(1), trace)

        filtered_alignment_log = []
        filtered_alignment_model = []
        for (log_elem, model_elem) in zip(alignment_log, alignment_model):
            # we filter out model moves of optional (start) transitions for now
            if log_elem == SKIP_MOVE and model_elem is None:
                continue

            filtered_alignment_log.append(AlignElement(activity=log_elem))
            filtered_alignment_model.append(AlignElement(activity=model_elem))

        assert (len(filtered_alignment_log) == len(filtered_alignment_model))
        rearranged_traces.append(TraceAlignment(log_alignment=filtered_alignment_log, model_alignment=filtered_alignment_model))

    return rearranged_traces


def rearrange_alignment(alignment: List[List[Tuple[str, str]]]) -> TraceAlignment:
    alignment_log = map(op.itemgetter(0), alignment)
    alignment_model = map(op.itemgetter(1), alignment)

    filtered_alignment_log = []
    filtered_alignment_model = []
    for (log_elem, model_elem) in zip(alignment_log, alignment_model):
        # we filter out model moves of optional (start) transitions for now
        if log_elem == SKIP_MOVE and model_elem is None:
            continue

        filtered_alignment_log.append(AlignElement(activity=log_elem))
        filtered_alignment_model.append(AlignElement(activity=model_elem))

    assert (len(filtered_alignment_log) == len(filtered_alignment_model))
    return TraceAlignment(log_alignment=filtered_alignment_log, model_alignment=filtered_alignment_model)


@app.task()
def compute_alignments(process_ocel: str, threshold: float, object_type: str, trace: List[str]):
    process_ocel = PureWindowsPath(process_ocel).as_posix()

    # we know that the DFM exists because the `compute_alignments` endpoint does not start this task before the DFM is discovered
    long_term_cache = get_long_term_cache()
    dfm = FrontendFriendlyDFM(**long_term_cache.get(process_ocel, dfm_cache_key()))
    dfg = filter_threshold_of_graph_notation(dfm, object_type, threshold)

    projected_log = build_trace_event_log(trace)
    petrinet, initial_marking, final_marking = build_petrinet(dfg)

    aligned_traces = conformance_diagnostics_alignments(projected_log, petrinet, initial_marking, final_marking)

    return rearrange_alignment(aligned_traces[0]['alignment']).dict()


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


def build_trace_event_log(trace: List[str]) -> EventLog:
    df = pandas.DataFrame({
        "concept:name": trace,
        "time:timestamp": list(range(len(trace))),
        "case:concept:name": 1
    })

    return log_conv_factory.apply(df)

def build_petrinet(dfg):
    net = PetriNet()

    # "A place for each node ∈ N (this includes places belonging to start and end)"
    node_places = {}
    explori_start_place = None
    explori_end_place = None
    for (i, node) in enumerate(dfg.nodes):
        node_places[i] = add_place(net, name=node)
        if node == START_TOKEN:
            explori_start_place = node_places[i]
        elif node == STOP_TOKEN:
            explori_end_place = node_places[i]

    assert(explori_start_place is not None and explori_end_place is not None)

    # add artificial start to net because EXPLORI_START node will be target node of the EXPLORI_START transition
    petrinet_start_place = add_place(net)
    add_connected_transition(petrinet_start_place, explori_start_place, START_TOKEN, START_TOKEN, net)

    # "For each edge (s, t) ∈ E, a subgraph connecting the place belonging to s to the place belonging to t.
    # This subgraph depends on whether t is end. If t is end, then this subgraph is a silent transition
    # connecting s to t. If t is not end, then this subgraph executes ts and tc in sequence, where ts is optional.
    for edge in dfg.edges:
        s = node_places[edge.source]
        t = node_places[edge.target]

        if t == explori_end_place:
            add_connected_transition(s, t, STOP_TOKEN, STOP_TOKEN, net)
        else:
            target_label = dfg.nodes[edge.target]
            add_connected_transition(s, t, target_label, target_label, net)

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
