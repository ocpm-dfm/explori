import datetime
import json
from unittest import TestCase

from pandas import DataFrame, Timestamp

from cache import get_long_term_cache, aligned_times
from worker.tasks.alignments import TraceAlignment, AlignElement, SKIP_MOVE
from worker.tasks.dfm import START_TOKEN, STOP_TOKEN
from worker.tasks.performance import align_log, align_projected_log_times_task, align_case, ProjectedEventTime, \
    AlignedEdgeTimes, ocel_performance_metrics_task


class PerformanceTests(TestCase):

    def test_run_activation_time_determination(self):
        alignments = [
            {
                "log_alignment": [
                    {
                        "activity": "|EXPLORI_START|"
                    },
                    {
                        "activity": "Create Purchase Requisition"
                    },
                    {
                        "activity": "Create Purchase Order"
                    },
                    {
                        "activity": "Receive Goods"
                    },
                    {
                        "activity": "Issue Goods Receipt"
                    },
                    {
                        "activity": "Plan Goods Issue"
                    },
                    {
                        "activity": "Verify Material"
                    },
                    {
                        "activity": ">>"
                    },
                    {
                        "activity": "Goods Issue"
                    },
                    {
                        "activity": "|EXPLORI_END|"
                    }
                ],
                "model_alignment": [
                    {
                        "activity": "|EXPLORI_START|"
                    },
                    {
                        "activity": "Create Purchase Requisition"
                    },
                    {
                        "activity": "Create Purchase Order"
                    },
                    {
                        "activity": "Receive Goods"
                    },
                    {
                        "activity": "Issue Goods Receipt"
                    },
                    {
                        "activity": ">>"
                    },
                    {
                        "activity": "Verify Material"
                    },
                    {
                        "activity": "Plan Goods Issue"
                    },
                    {
                        "activity": "Goods Issue"
                    },
                    {
                        "activity": "|EXPLORI_END|"
                    }
                ]
            },
            {
                "log_alignment": [
                    {
                        "activity": "|EXPLORI_START|"
                    },
                    {
                        "activity": "Create Purchase Requisition"
                    },
                    {
                        "activity": "Create Purchase Order"
                    },
                    {
                        "activity": "Receive Goods"
                    },
                    {
                        "activity": "Issue Goods Receipt"
                    },
                    {
                        "activity": "Verify Material"
                    },
                    {
                        "activity": "Plan Goods Issue"
                    },
                    {
                        "activity": "Goods Issue"
                    },
                    {
                        "activity": "|EXPLORI_END|"
                    }
                ],
                "model_alignment": [
                    {
                        "activity": "|EXPLORI_START|"
                    },
                    {
                        "activity": "Create Purchase Requisition"
                    },
                    {
                        "activity": "Create Purchase Order"
                    },
                    {
                        "activity": "Receive Goods"
                    },
                    {
                        "activity": "Issue Goods Receipt"
                    },
                    {
                        "activity": "Verify Material"
                    },
                    {
                        "activity": "Plan Goods Issue"
                    },
                    {
                        "activity": "Goods Issue"
                    },
                    {
                        "activity": "|EXPLORI_END|"
                    }
                ]
            }
        ]

        print(align_projected_log_times_task("data/mounted/p2p-normal.jsonocel", "MATERIAL", alignments))

    def test_run_ocel_performance_metrics_task(self):
        ocel = "data/mounted/p2p-normal.jsonocel"
        object_types = ['MATERIAL', 'PURCHORD', 'PURCHREQ', 'INVOICE', 'GDSRCPT']
        long_term_cache = get_long_term_cache()
        loaded_aligned_times = {ot: long_term_cache.get(ocel, aligned_times(ocel, 0.0, ot))['result'] for ot in object_types}

        print(ocel_performance_metrics_task(ocel, loaded_aligned_times).json())


    def test_align_case_with_synchronized_moves_only(self):
        dt1 = Timestamp('2023-01-01 00:00:00')
        dt2 = Timestamp('2023-01-02 00:00:00')
        dt3 = Timestamp('2023-01-03 00:00:00')
        case = DataFrame({
            "concept:name": ["a", "b", "c"],
            "event_id": [0, 1, 2],
            "time:timestamp": [dt1, dt2, dt3]
        })
        alignments = {
            ('a', 'b', 'c'): TraceAlignment(log_alignment=[
                AlignElement(activity="a"),
                AlignElement(activity="b"),
                AlignElement(activity="c"),
            ], model_alignment=[
                AlignElement(activity="a"),
                AlignElement(activity="b"),
                AlignElement(activity="c"),
            ])
        }

        aligned_times = align_case(case, alignments)

        at1 = ProjectedEventTime(dt1, 0)
        at2 = ProjectedEventTime(dt2, 0)
        at3 = ProjectedEventTime(dt3, 0)
        expected_result = {
            0: AlignedEdgeTimes(None, None, at1),
            1: AlignedEdgeTimes("a", at1, at2),
            2: AlignedEdgeTimes("b", at2, at3)
        }
        self.assertEqual(expected_result, aligned_times)
        print(aligned_times)

    def test_align_case_with_log_move(self):
        dt1 = Timestamp('2023-01-01 00:00:00')
        dt2 = Timestamp('2023-01-02 00:00:00')
        dt3 = Timestamp('2023-01-03 00:00:00')
        case = DataFrame({
            "concept:name": ["a", "b", "c"],
            "event_id": [0, 1, 2],
            "time:timestamp": [dt1, dt2, dt3]
        })
        alignments = {
            ('a', 'b', 'c'): TraceAlignment(log_alignment=[
                AlignElement(activity="a"),
                AlignElement(activity="b"),
                AlignElement(activity="c"),
            ], model_alignment=[
                AlignElement(activity="a"),
                AlignElement(activity=SKIP_MOVE),
                AlignElement(activity="c"),
            ])
        }

        aligned_times = align_case(case, alignments)

        at1 = ProjectedEventTime(dt1, 0)
        at2 = ProjectedEventTime(dt2, 0)
        at3 = ProjectedEventTime(dt3, 0)
        expected_result = {
            0: AlignedEdgeTimes(None, None, at1),
            2: AlignedEdgeTimes("a", at1, at3)
        }
        self.assertEqual(expected_result, aligned_times)
        print(aligned_times)

    def test_align_case_with_model_move(self):
        dt1 = Timestamp('2023-01-01 00:00:00')
        dt2 = Timestamp('2023-01-02 00:00:00')
        dt3 = Timestamp('2023-01-03 00:00:00')
        case = DataFrame({
            "concept:name": ["a", "c"],
            "event_id": [0, 2],
            "time:timestamp": [dt1, dt3]
        })
        alignments = {
            ('a', 'c'): TraceAlignment(log_alignment=[
                AlignElement(activity="a"),
                AlignElement(activity=SKIP_MOVE),
                AlignElement(activity="c"),
            ], model_alignment=[
                AlignElement(activity="a"),
                AlignElement(activity="b"),
                AlignElement(activity="c"),
            ])
        }

        aligned_times = align_case(case, alignments)

        at1 = ProjectedEventTime(dt1, 0)
        at2 = ProjectedEventTime(dt2, 0)
        at3 = ProjectedEventTime(dt3, 1)
        expected_result = {
            0: AlignedEdgeTimes(None, None, at1),
            2: AlignedEdgeTimes("a", at1, at3)
        }
        self.assertEqual(expected_result, aligned_times)
        print(aligned_times)

    def test_align_log(self):
        dt1 = datetime.datetime(2023, 1, 1)
        dt2 = datetime.datetime(2023, 1, 2)
        dt3 = datetime.datetime(2023, 1, 3)

        log = {
            "case-1": [
                ("a", dt1),
                ("b", dt2),
                ("c", dt3)
            ],
            "case-2": [
                ("a", dt1),
                ("c", dt2),
                ("b", dt3)
            ],
            "case-3": [
                ("d", dt1),
                ("f", dt2),
                ("g", dt3)
            ]
        }

        alignments = [
            TraceAlignment(log_alignment=[
                AlignElement(activity=START_TOKEN),
                AlignElement(activity="a"),
                AlignElement(activity="b"),
                AlignElement(activity="c"),
                AlignElement(activity=STOP_TOKEN)
            ], model_alignment=[
                AlignElement(activity=START_TOKEN),
                AlignElement(activity="a"),
                AlignElement(activity="b"),
                AlignElement(activity="c"),
                AlignElement(activity=STOP_TOKEN)
            ]).dict(),

            TraceAlignment(log_alignment=[
                AlignElement(activity=START_TOKEN),
                AlignElement(activity="a"),
                AlignElement(activity="c"),
                AlignElement(activity="b"),
                AlignElement(activity=STOP_TOKEN)
            ], model_alignment=[
                AlignElement(activity=START_TOKEN),
                AlignElement(activity="a"),
                AlignElement(activity=SKIP_MOVE),
                AlignElement(activity="b"),
                AlignElement(activity=STOP_TOKEN)
            ]).dict(),

            TraceAlignment(log_alignment=[
                AlignElement(activity=START_TOKEN),
                AlignElement(activity="d"),
                AlignElement(activity=SKIP_MOVE),
                AlignElement(activity="f"),
                AlignElement(activity="g"),
                AlignElement(activity=STOP_TOKEN)
            ], model_alignment=[
                AlignElement(activity=START_TOKEN),
                AlignElement(activity="d"),
                AlignElement(activity="e"),
                AlignElement(activity="f"),
                AlignElement(activity="g"),
                AlignElement(activity=STOP_TOKEN)
            ]).dict()
        ]

        aligned_log = align_log(log, alignments)

        print(aligned_log)

        expected_log = DataFrame({
            'case:concept:name': ["1", "1", "1", "2", "2", "3", "4", "4"],
            'concept:name': ['a', 'b', 'c', 'a', 'b', 'd', 'f', 'g'],
            'time:timestamp': [dt1, dt2, dt3, dt1, dt3, dt1, dt2, dt3]
        })

        print(expected_log)

        print((expected_log == aligned_log))

        self.assertTrue((expected_log == aligned_log).all().all())
