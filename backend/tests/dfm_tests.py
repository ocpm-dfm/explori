import json
import os
from typing import Dict, List, Tuple
from unittest import TestCase

from shared_types import FrontendFriendlyDFM, FrontendFriendlyEdge
from worker.tasks.dfm import prepare_dfg_computation, \
    calculate_threshold_counts_on_dfg, START_TOKEN, STOP_TOKEN, CountSeperator, ObjectType, Edge, Node, \
    convert_to_frontend_friendly_graph_notation, calculate_ocel_node_counts


class DfmTests(TestCase):

    def test_prepare_dfm_on_simple(self):
        projected_traces = DfmTests.get_simple_traces()

        traces_a = projected_traces["type_a"]
        edge_counts, node_counts, edge_traces, total_objects = prepare_dfg_computation(traces_a)
        wrapped = DfmTests.wrap_traces_with_start_stop_tokens(traces_a)
        self.assertEqual(15, node_counts["a"])
        self.assertEqual(15, node_counts["b"])
        self.assertEqual(10, node_counts["c"])
        self.assertEqual(15, edge_counts[("a", "b")])
        self.assertEqual(10, edge_counts[("b", "c")])
        self.assertEqual(wrapped[:], edge_traces[("a", "b")])
        self.assertEqual(wrapped[:1], edge_traces[("b", "c")])

        traces_b = projected_traces["type_b"]
        edge_counts, node_counts, edge_traces, total_objects = prepare_dfg_computation(traces_b)
        wrapped = DfmTests.wrap_traces_with_start_stop_tokens(traces_b)
        self.assertEqual(11, node_counts["a"])
        self.assertEqual(15, node_counts["b"])
        self.assertEqual(16, node_counts["c"])
        self.assertEqual(10, edge_counts[("a", "b")])
        self.assertEqual(15, edge_counts[("b", "c")])
        self.assertEqual(1, edge_counts[("a", "c")])
        self.assertEqual(wrapped[:1], edge_traces[("a", "b")])
        self.assertEqual(wrapped[:2], edge_traces[("b", "c")])
        self.assertEqual(wrapped[2:], edge_traces[("a", "c")])

    def test_prepare_dfm_looping(self):
        projected_traces = DfmTests.get_simple_looping_traces()

        traces_one = projected_traces["one"]
        edge_counts, node_counts, edge_traces, total_objects = prepare_dfg_computation(traces_one)
        wrapped = DfmTests.wrap_traces_with_start_stop_tokens(traces_one)
        self.assertEqual(3, node_counts["a"])
        self.assertEqual(2, edge_counts[("a", "a")])
        self.assertEqual(wrapped[:], edge_traces[("a", "a")])

        traces_two = projected_traces["two"]
        edge_counts, node_counts, edge_traces, total_objects = prepare_dfg_computation(traces_two)
        wrapped = DfmTests.wrap_traces_with_start_stop_tokens(traces_two)
        self.assertEqual(2, node_counts["a"])
        self.assertEqual(2, node_counts["b"])
        self.assertEqual(2, edge_counts[("a", "b")])
        self.assertEqual(1, edge_counts[("b", "a")])
        self.assertEqual(wrapped[:], edge_traces[("a", "b")])
        self.assertEqual(wrapped[:], edge_traces[("b", "a")])

    def test_all_counts_have_a_zero_range(self):
        def test(projected_traces):
            for object_type in projected_traces:
                if object_type == 'resource-traces':
                    projected_traces[object_type] = [trace for trace in projected_traces[object_type] if
                                                     'cross-referenced' in trace[0]]

                edge_totals, node_totals, edge_traces, total_objects = prepare_dfg_computation(
                    projected_traces[object_type])
                edge_counts, node_counts, trace_thresholds = calculate_threshold_counts_on_dfg(edge_totals, node_totals,
                                                                                               edge_traces,
                                                                                               total_objects)

                for edge in edge_totals:
                    self.assertIn(edge, edge_counts, "No count ranges exist for edge.")
                    self.assertEqual(0, edge_counts[edge][0][1])
                for node in node_totals:
                    self.assertIn(node, node_counts, "No counts exist for node.")
                    self.assertEqual(0, node_counts[node][0].instance_count,
                                     "No zero range exists for node.")

        test(DfmTests.get_simple_traces())
        test(DfmTests.get_simple_looping_traces())
        # test(DfmTests.load_traces_from_resources("github-pm4py-traces.json"))

    def test_edge_and_node_counts_using_trace_thresholds(self):
        def test(traces):
            edge_totals, node_totals, edge_traces, total_objects = prepare_dfg_computation(traces)
            edge_counts, node_counts, trace_thresholds = calculate_threshold_counts_on_dfg(edge_totals, node_totals,
                                                                                           edge_traces, total_objects)

            for node in node_totals:
                counts = node_counts[node]
                for (threshold, calculated_count) in counts:
                    reference_count = 0
                    for (actions, (trace_count, trace_threshold)) in trace_thresholds.items():
                        if trace_threshold >= threshold:
                            continue

                        for action in actions:
                            if action == node:
                                reference_count += trace_count

                    self.assertEqual(reference_count, calculated_count,
                                     f"Node counts for node {node} does not match at threshold <{threshold}")

            for edge in edge_counts:
                counts = edge_counts[edge]
                for (threshold, calculated_count) in counts:
                    reference_count = 0
                    for (actions, (trace_count, trace_threshold)) in trace_thresholds.items():
                        if trace_threshold >= threshold:
                            continue

                        for i in range(len(actions) - 1):
                            step = (actions[i], actions[i + 1])
                            if step == edge:
                                reference_count += trace_count

                    self.assertEqual(reference_count, calculated_count,
                                     f"Edge counts for edge {edge} does not match at threshold <{threshold}")

        def test_all_object_types(projected_traces):
            for traces in projected_traces.values():
                test(traces)

        test_all_object_types(DfmTests.get_simple_traces())
        test_all_object_types(DfmTests.get_simple_looping_traces())
        # test_all_object_types(DfmTests.load_traces_from_resources("github-pm4py-traces.json"))

    def test_ocel_node_counts(self):
        projected_traces = {
            "one": [
                (["a", "b", "d"], 1, [[1], [2], [4]]),
                (["a", "c", "d"], 1, [[1], [3], [4]])
            ],
            "two": [
                (["a", "b", "d"], 1, [[1], [2], [4]]),
                (["a", "e", "e", "d"], 1, [[1], [5], [6], [4]])
            ],
            "three": [
                (["a", "c", "d"], 1, [[1], [7], [4]])
            ],
        }
        # These thresholds are not technically correct for the given input log, but the test works better this way.
        trace_thresholds = {
            "one": {
                (START_TOKEN, "a", "b", "d", STOP_TOKEN): (1, 0.25),
                (START_TOKEN, "a", "c", "d", STOP_TOKEN): (1, 0.75)
            },
            "two": {
                (START_TOKEN, "a", "b", "d", STOP_TOKEN): (1, 0.25),
                (START_TOKEN, "a", "e", "e", "d", STOP_TOKEN): (1, 0.5)
            },
            "three": {
                (START_TOKEN, "a", "c", "d", STOP_TOKEN): (1, 0.9)
            }
        }

        node_counts = calculate_ocel_node_counts(projected_traces, trace_thresholds)

        self.assertEqual({
            START_TOKEN: [CountSeperator(1.01, 0)],
            "a": [CountSeperator(0.25, 0), CountSeperator(1.01, 1)],
            "b": [CountSeperator(0.25, 0), CountSeperator(1.01, 1)],
            "c": [CountSeperator(0.75, 0), CountSeperator(0.9, 1), CountSeperator(1.01, 2)],
            "d": [CountSeperator(0.25, 0), CountSeperator(1.01, 1)],
            "e": [CountSeperator(0.5, 0), CountSeperator(1.01, 2)],
            STOP_TOKEN: [CountSeperator(1.01, 0)]
        }, node_counts)


    def test_frontend_friendly(self):
        projected_traces = DfmTests.get_simple_traces()
        edge_counts: Dict[ObjectType, Dict[Edge, List[CountSeperator]]] = {}
        node_counts: Dict[ObjectType, Dict[Node, List[CountSeperator]]] = {}
        trace_thresholds: Dict[ObjectType, Dict[Tuple[Node], Tuple[int, float]]] = {}

        for object_type in projected_traces:
            edge_totals, node_totals, edge_traces, total_objects = prepare_dfg_computation(
                projected_traces[object_type])

            type_edge_counts, type_node_counts, type_trace_thresholds = \
                calculate_threshold_counts_on_dfg(edge_totals, node_totals, edge_traces, total_objects)

            edge_counts[object_type] = type_edge_counts
            node_counts[object_type] = type_node_counts
            trace_thresholds[object_type] = type_trace_thresholds

        ocel_node_counts = calculate_ocel_node_counts(projected_traces, trace_thresholds)

        frontend_friendly = convert_to_frontend_friendly_graph_notation(edge_counts, node_counts, ocel_node_counts, trace_thresholds)
        frontend_friendly = FrontendFriendlyDFM(**frontend_friendly)

        expected_edge_traces = {
            ("type_a", START_TOKEN, "a"): {(START_TOKEN, "a", "b", "c", STOP_TOKEN),
                                           (START_TOKEN, "a", "b", STOP_TOKEN)},
            ("type_a", "a", "b"): {(START_TOKEN, "a", "b", "c", STOP_TOKEN), (START_TOKEN, "a", "b", STOP_TOKEN)},
            ("type_a", "b", "c"): {(START_TOKEN, "a", "b", "c", STOP_TOKEN)},
            ("type_a", "b", STOP_TOKEN): {(START_TOKEN, "a", "b", STOP_TOKEN)},
            ("type_a", "c", STOP_TOKEN): {(START_TOKEN, "a", "b", "c", STOP_TOKEN)},
            ("type_b", START_TOKEN, "a"): {(START_TOKEN, "a", "b", "c", STOP_TOKEN),
                                           (START_TOKEN, "a", "c", STOP_TOKEN)},
            ("type_b", START_TOKEN, "b"): {(START_TOKEN, "b", "c", STOP_TOKEN)},
            ("type_b", "a", "b"): {(START_TOKEN, "a", "b", "c", STOP_TOKEN)},
            ("type_b", "b", "c"): {(START_TOKEN, "a", "b", "c", STOP_TOKEN), (START_TOKEN, "b", "c", STOP_TOKEN)},
            ("type_b", "a", "c"): {(START_TOKEN, "a", "c", STOP_TOKEN)},
            ("type_b", "c", STOP_TOKEN): {(START_TOKEN, "a", "b", "c", STOP_TOKEN),
                                          (START_TOKEN, "b", "c", STOP_TOKEN),
                                          (START_TOKEN, "a", "c", STOP_TOKEN)}
        }

        expected_node_traces = {
            START_TOKEN: {(START_TOKEN, "a", "b", "c", STOP_TOKEN),
                          (START_TOKEN, "a", "b", STOP_TOKEN),
                          (START_TOKEN, "a", "c", STOP_TOKEN),
                          (START_TOKEN, "b", "c", STOP_TOKEN)},
            "a": {(START_TOKEN, "a", "b", "c", STOP_TOKEN),
                  (START_TOKEN, "a", "b", STOP_TOKEN),
                  (START_TOKEN, "a", "c", STOP_TOKEN)},
            "b": {(START_TOKEN, "a", "b", "c", STOP_TOKEN),
                  (START_TOKEN, "a", "b", STOP_TOKEN),
                  (START_TOKEN, "b", "c", STOP_TOKEN)},
            "c": {(START_TOKEN, "a", "b", "c", STOP_TOKEN),
                  (START_TOKEN, "a", "c", STOP_TOKEN),
                  (START_TOKEN, "b", "c", STOP_TOKEN)},
            STOP_TOKEN: {(START_TOKEN, "a", "b", "c", STOP_TOKEN),
                         (START_TOKEN, "a", "b", STOP_TOKEN),
                         (START_TOKEN, "a", "c", STOP_TOKEN),
                         (START_TOKEN, "b", "c", STOP_TOKEN)},
        }

        traces_as_nodes = []
        for trace in frontend_friendly.traces:
            trace_tuple = tuple(frontend_friendly.nodes[node_id].label for node_id in trace.actions)
            traces_as_nodes.append(trace_tuple)

            for object_type in trace_thresholds:
                if trace_tuple in trace_thresholds[object_type]:
                    expected_count, expected_threshold = trace_thresholds[object_type][trace_tuple]
                    self.assertEqual(expected_count, trace.thresholds[object_type].count)
                    self.assertEqual(expected_threshold, trace.thresholds[object_type].threshold)

        for (object_type, edges) in frontend_friendly.subgraphs.items():
            edges: List[FrontendFriendlyEdge] = edges
            for edge in edges:
                source_node = frontend_friendly.nodes[edge.source].label
                target_node = frontend_friendly.nodes[edge.target].label
                print(object_type, source_node, target_node)
                expected_traces = expected_edge_traces[object_type, source_node, target_node]
                real_traces = set(traces_as_nodes[trace_id] for trace_id in edge.traces)

                self.assertEqual(expected_traces, real_traces)
                self.assertEqual(edge_counts[object_type][source_node, target_node], edge.counts)

        for node in frontend_friendly.nodes:
            real_traces = set(traces_as_nodes[trace_id] for trace_id in node.traces)
            self.assertEqual(expected_node_traces[node.label], real_traces)
            self.assertEqual(ocel_node_counts[node.label], node.ocel_counts)

            for object_type in node_counts:
                if node.label in node_counts[object_type]:
                    self.assertEqual(node_counts[object_type][node.label], node.counts[object_type])

    @staticmethod
    def get_simple_traces():
        def range_list(start: int, count: int):
            return list(range(start, start + count))

        traces_tA = [
            (["a", "b", "c"], 10, [range_list(0, 10), range_list(10, 10), range_list(20, 10)]),
            (["a", "b"], 5, [range_list(30, 5), range_list(35, 5)])
        ]
        traces_tB = [
            (["a", "b", "c"], 10, [range_list(0, 10), range_list(10, 10), range_list(20, 10)]),
            (["b", "c"], 5, [range_list(35, 5), range_list(40, 5)]),
            (["a", "c"], 1, [[46], [47]])
        ]
        projected_traces = {
            "type_a": traces_tA,
            "type_b": traces_tB
        }
        return projected_traces

    @staticmethod
    def get_simple_looping_traces():
        traces_one = [(["a", "a", "a"], 1, [[1], [2], [3]])]
        traces_two = [(["a", "b", "a", "b"], 1, [[4], [5], [6], [7]])]
        return {
            "one": traces_one,
            "two": traces_two
        }

    @staticmethod
    def load_traces_from_resources(name):
        filename = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resources", name)
        with open(filename, 'r') as f:
            return json.load(f)

    @staticmethod
    def wrap_traces_with_start_stop_tokens(traces):
        return [([START_TOKEN] + actions + [STOP_TOKEN], count, [[]] + event_ids + [[]]) for (actions, count, event_ids) in traces]
