import datetime
from unittest import TestCase

from pandas import DataFrame

from worker.tasks.alignments import TraceAlignment, AlignElement, SKIP_MOVE
from worker.tasks.dfm import START_TOKEN, STOP_TOKEN
from worker.tasks.performance import align_log


class PerformanceTests(TestCase):

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
