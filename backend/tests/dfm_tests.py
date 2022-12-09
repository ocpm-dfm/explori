import json
import os
from unittest import TestCase

from worker.tasks.dfm import prepare_dfg_computation, \
    calculate_threshold_counts_on_dfg, combine_node_counts, START_TOKEN, STOP_TOKEN, CountSeperator


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

                edge_totals, node_totals, edge_traces, total_objects = prepare_dfg_computation(projected_traces[object_type])
                edge_counts, node_counts = calculate_threshold_counts_on_dfg(edge_totals, node_totals, edge_traces, total_objects)

                for edge in edge_totals:
                    self.assertIn(edge, edge_counts, "No count ranges exist for edge.")
                    self.assertEqual(0, edge_counts[edge][0][1])
                for node in node_totals:
                    self.assertIn(node, node_counts, "No counts exist for node.")
                    self.assertEqual(0, node_counts[node][0].instance_count,
                                     "No zero range exists for node.")

        test(DfmTests.get_simple_traces())
        test(DfmTests.get_simple_looping_traces())
        test(DfmTests.load_traces_from_resources("github-pm4py-traces.json"))

    def test_combine_node_counts(self):
        type_a_count = {"n": [                          CountSeperator(0.5, 10),                           CountSeperator(1, 20)]}
        type_b_count = {"n": [CountSeperator(0.25, 10), CountSeperator(0.5, 20), CountSeperator(0.75, 30), CountSeperator(1, 40)]}
        expected = {"n": [CountSeperator(0.25, 10), CountSeperator(0.5, 30), CountSeperator(0.75, 40), CountSeperator(1, 60)]}

        self.assertEqual(expected, combine_node_counts({"a": type_a_count, "b": type_b_count}))

    @staticmethod
    def get_simple_traces():
        traces_tA = [
            (["a", "b", "c"], 10),
            (["a", "b"], 5)
        ]
        traces_tB = [
            (["a", "b", "c"], 10),
            (["b", "c"], 5),
            (["a", "c"], 1)
        ]
        projected_traces = {
            "type_a": traces_tA,
            "type_b": traces_tB
        }
        return projected_traces

    @staticmethod
    def get_simple_looping_traces():
        traces_one = [(["a", "a", "a"], 1)]
        traces_two = [(["a", "b", "a", "b"], 1)]
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
        return [([START_TOKEN] + actions + [STOP_TOKEN], count) for (actions, count) in traces]