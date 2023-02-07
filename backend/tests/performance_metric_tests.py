import datetime
import json
import os.path
from unittest import TestCase

from pandas import DataFrame, Timestamp

from worker.tasks.alignments import TraceAlignment, AlignElement, SKIP_MOVE
from worker.tasks.dfm import START_TOKEN, STOP_TOKEN
from worker.tasks.performance import align_log, align_projected_log_times_task, align_case, ProjectedEventTime, \
    AlignedEdgeTimes, ocel_performance_metrics_task, collect_times


class PerformanceTests(TestCase):

    # region Aligning time tests
    def test_run_activation_time_determination(self):
        base_folder = os.path.join(self.get_resources_folder(), "p2p-normal")
        ocel = os.path.join(base_folder, 'p2p-normal.jsonocel')

        with open(os.path.join(base_folder, 'alignments-MATERIAL.json'), 'r') as f:
            alignments = json.load(f)

        print(align_projected_log_times_task(ocel, "MATERIAL", alignments))

    def test_align_case_with_synchronized_moves_only(self):
        dt1 = Timestamp('2023-01-01 00:00:00')
        dt2 = Timestamp('2023-01-02 00:00:00')
        dt3 = Timestamp('2023-01-03 00:00:00')
        dt4 = Timestamp('2023-01-04 00:00:00')
        dt5 = Timestamp('2023-01-05 00:00:00')
        dt6 = Timestamp('2023-01-06 00:00:00')
        case = DataFrame({
            "concept:name": ["a", "b", "c"],
            "event_id": [0, 1, 2],
            "event_start_timestamp": [dt1, dt3, dt5],
            "time:timestamp": [dt2, dt4, dt6]
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

        expected_result = {
            0: AlignedEdgeTimes(None, None, ProjectedEventTime(dt1, 0)),
            1: AlignedEdgeTimes("a", ProjectedEventTime(dt2, 0), ProjectedEventTime(dt3, 0)),
            2: AlignedEdgeTimes("b", ProjectedEventTime(dt4, 0), ProjectedEventTime(dt5, 0))
        }
        self.assertEqual(expected_result, aligned_times)
        print(aligned_times)

    def test_align_case_with_log_move(self):
        dt1 = Timestamp('2023-01-01 00:00:00')
        dt2 = Timestamp('2023-01-02 00:00:00')
        dt3 = Timestamp('2023-01-03 00:00:00')
        dt4 = Timestamp('2023-01-03 00:00:00')
        dt5 = Timestamp('2023-01-03 00:00:00')
        dt6 = Timestamp('2023-01-03 00:00:00')
        case = DataFrame({
            "concept:name": ["a", "b", "c"],
            "event_id": [0, 1, 2],
            'event_start_timestamp': [dt1, dt3, dt5],
            "time:timestamp": [dt2, dt4, dt6]
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

        expected_result = {
            0: AlignedEdgeTimes(None, None, ProjectedEventTime(dt1, 0)),
            2: AlignedEdgeTimes("a", ProjectedEventTime(dt2, 0), ProjectedEventTime(dt3, 0))
        }
        self.assertEqual(expected_result, aligned_times)
        print(aligned_times)

    def test_align_case_with_model_move(self):
        dt1 = Timestamp('2023-01-01 00:00:00')
        dt2 = Timestamp('2023-01-02 00:00:00')
        dt3 = Timestamp('2023-01-03 00:00:00')
        dt4 = Timestamp('2023-01-04 00:00:00')
        dt5 = Timestamp('2023-01-05 00:00:00')
        dt6 = Timestamp('2023-01-06 00:00:00')
        case = DataFrame({
            "concept:name": ["a", "c"],
            "event_id": [0, 2],
            "event_start_timestamp": [dt1, dt5],
            "time:timestamp": [dt2, dt6]
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

        expected_result = {
            0: AlignedEdgeTimes(None, None, ProjectedEventTime(dt1, 0)),
            2: AlignedEdgeTimes("a", ProjectedEventTime(dt2, 0), ProjectedEventTime(dt5, 1))
        }
        self.assertEqual(expected_result, aligned_times)
        print(aligned_times)

    # endregion

    # region Performance metric tests
    def test_run_ocel_performance_metrics_task(self):
        base_folder = os.path.join(self.get_resources_folder(), "p2p-normal")
        ocel = os.path.join(base_folder, 'p2p-normal.jsonocel')
        object_types = ['MATERIAL', 'PURCHORD', 'PURCHREQ', 'INVOICE', 'GDSRCPT']
        loaded_aligned_times = {}
        for ot in object_types:
            with open(os.path.join(base_folder, f"aligned_times-{ot}.json"), 'r') as f:
                loaded_aligned_times[ot] = json.load(f)['result']

        print(ocel_performance_metrics_task(ocel, loaded_aligned_times))

    def test_collect_times_with_sync_moves(self):
        ocel = DataFrame.from_records(data=[
            {
                'event_id': '0',
                'event_activity': 'Act 2',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T00:00:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T01:00:00+01:00'),
                'A': [],
                'B': ['B0']
            },
            {
                'event_id': '1',
                'event_activity': 'Act 1',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T00:30:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T01:45:00+01:00'),
                'A': ['A0'],
                'B': []
            },
            {
                'event_id': '2',
                'event_activity': 'Act 1',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T01:45:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T03:00:00+01:00'),
                'A': ['A1'],
                'B': []
            },
            {
                'event_id': '3',
                'event_activity': 'Act 2',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T04:00:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T05:00:00+01:00'),
                'A': [],
                'B': ['B1']
            },
            {
                'event_id': '4',
                'event_activity': 'Act 3',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T08:00:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T10:00:00+01:00'),
                'A': ['A0', 'A1'],
                'B': ['B0', 'B1']
            }
        ])
        aligned_times = {
            "A": {
                "1": {
                    "A0": [
                        None,
                        None,
                        [
                            "2023-01-01T00:30:00+01:00",
                            0
                        ]
                    ]
                },
                "2": {
                    "A1": [
                        None,
                        None,
                        [
                            "2023-01-01T01:45:00+01:00",
                            0
                        ]
                    ]
                },
                "4": {
                    "A0": [
                        "Act 1",
                        [
                            "2023-01-01T01:45:00+01:00",
                            0
                        ],
                        [
                            "2023-01-01T08:00:00+01:00",
                            0
                        ]
                    ],
                    "A1": [
                        "Act 1",
                        [
                            "2023-01-01T03:00:00+01:00",
                            0
                        ],
                        [
                            "2023-01-01T08:00:00+01:00",
                            0
                        ]
                    ]
                }
            },
            "B": {
                "0": {
                    "B0": [
                        None,
                        None,
                        [
                            "2023-01-01T00:00:00+01:00",
                            0
                        ]
                    ]
                },
                "3": {
                    "B1": [
                        None,
                        None,
                        [
                            "2023-01-01T04:00:00+01:00",
                            0
                        ]
                    ]
                },
                "4": {
                    "B0": [
                        "Act 2",
                        [
                            "2023-01-01T01:00:00+01:00",
                            0
                        ],
                        [
                            "2023-01-01T08:00:00+01:00",
                            0
                        ]
                    ],
                    "B1": [
                        "Act 2",
                        [
                            "2023-01-01T05:00:00+01:00",
                            0
                        ],
                        [
                            "2023-01-01T08:00:00+01:00",
                            0
                        ]
                    ]
                }
            }
        }
        collected_times = collect_times(ocel, aligned_times)

        self.assertEqual(collected_times.service_times, {
            'Act 1': [1.25 * 3600, 1.25 * 3600],
            'Act 2': [3600, 3600],
            'Act 3': [2 * 3600]
        })
        self.assertEqual(collected_times.waiting_times, {
            'Act 3': [3 * 3600]
        })
        self.assertEqual(collected_times.sojourn_times, {
            'Act 3': [5 * 3600]
        })
        self.assertEqual(collected_times.lagging_times, {
            'Act 3': [2 * 3600]
        })
        self.assertEqual(collected_times.synchronization_times, {
            'Act 3': [4 * 3600]
        })
        self.assertEqual(collected_times.flow_times, {
            'Act 3': [6 * 3600]
        })
        self.assertEqual(collected_times.pooling_times, {
            'Act 3': {
                'A': [1.25 * 3600],
                'B': [4 * 3600]
            }
        })
        self.assertEqual(collected_times.edge_pooling_times, {
            'Act 1': {
                'Act 3': {
                    'A': [1.25 * 3600]
                }
            },
            'Act 2': {
                'Act 3': {
                    'B': [4 * 3600]
                }
            }
        })
        self.assertEqual(collected_times.edge_waiting_times, {
            'Act 1': {
                'Act 3': {
                    'A': [5 * 3600]
                }
            },
            'Act 2': {
                'Act 3': {
                    'B': [3 * 3600]
                }
            }
        })

    def test_collect_times_with_log_move(self):
        ocel = DataFrame.from_records(data=[
            {
                'event_id': '0',
                'event_activity': 'Act 1',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T00:00:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T01:00:00+01:00'),
                'A': ['A0'],
                'B': []
            },
            {
                'event_id': '1',
                'event_activity': 'Act 2',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T01:30:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T02:23:00+01:00'),
                'A': ['A0'],
                'B': []
            },
            {
                'event_id': '2',
                'event_activity': 'Act 3',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T02:00:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T03:00:00+01:00'),
                'A': ['A0'],
                'B': []
            }
        ])

        aligned_times = {
            'A': {
                '0': {
                    "A0": [
                        None,
                        None,
                        [
                            "2023-01-01T00:00:00+01:00",
                            0
                        ]
                    ]
                },
                '2': {
                    'A0': [
                        "Act 1",
                        [
                            "2023-01-01T01:00:00+01:00",
                            0
                        ],
                        [
                            "2023-01-01T02:00:00+01:00",
                            0
                        ]
                    ]
                }
            }
        }

        collected_times = collect_times(ocel, aligned_times)

        self.assertEqual(collected_times.edge_waiting_times, {
            'Act 1': {
                'Act 3': {
                    'A': [3600]
                }
            }
        })
        self.assertEqual(collected_times.waiting_times, {
            'Act 3': [3600]
        })

    def test_collect_times_with_model_move(self):
        ocel = DataFrame.from_records(data=[
            {
                'event_id': '0',
                'event_activity': 'Act 1',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T00:00:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T01:00:00+01:00'),
                'A': ['A0'],
                'B': []
            },
            {
                'event_id': '2',
                'event_activity': 'Act 3',
                'event_start_timestamp': Timestamp(ts_input='2023-01-01T02:00:00+01:00'),
                'event_timestamp': Timestamp(ts_input='2023-01-01T03:00:00+01:00'),
                'A': ['A0'],
                'B': []
            }
        ])

        aligned_times = {
            'A': {
                '0': {
                    "A0": [
                        None,
                        None,
                        [
                            "2023-01-01T00:00:00+01:00",
                            0
                        ]
                    ]
                },
                '2': {
                    'A0': [
                        "Act 1",
                        [
                            "2023-01-01T01:00:00+01:00",
                            0
                        ],
                        [
                            "2023-01-01T02:00:00+01:00",
                            1
                        ]
                    ]
                }
            }
        }

        collected_times = collect_times(ocel, aligned_times)
        self.assertEqual(collected_times.waiting_times, {})
        self.assertEqual(collected_times.edge_waiting_times, {})
    # endregion

    # region Legacy tests
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

    # endregion

    def get_resources_folder(self) -> str:
        tests_dir = os.path.split(os.path.abspath(__file__))[0]
        return os.path.join(tests_dir, "resources")
