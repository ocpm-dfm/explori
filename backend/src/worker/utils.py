from typing import Dict, List, Tuple

import pm4py
from ocpa.algo.util.util import project_log
from ocpa.objects.log.importer.csv.util import succint_mdl_to_exploded_mdl
from ocpa.objects.log.ocel import OCEL
from ocpa.objects.log.importer.ocel import factory as ocel_import_factory
from pandas import DataFrame
from pm4py.objects.log.obj import EventLog
from pydantic import BaseModel

from cache import get_long_term_cache, projected_log, projected_log_traces, metadata, LongTermCacheEntryType


class OCELMetadata(BaseModel):
    object_types: List[str]


def get_all_projected_traces(ocel_filename: str, build_if_non_existent: bool = True) -> Dict[str, List[Tuple[List[str], int]]] | None:
    if build_if_non_existent:
        ensure_that_all_event_projected_logs_exist(ocel_filename)

    meta = get_metadata(ocel_filename, build_if_non_existent=False)
    if not meta:  # The meta will always exist if build_if_non_existent is set to True.
        return None

    traces = {}
    for object_type in meta.object_types:
        projected_traces = get_projected_traces(ocel_filename, object_type, build_if_non_existent)
        if not projected_traces:
            return None  # Again, can only be none if build_if_non_existent is set to False.
        traces[object_type] = projected_traces
    return traces


def get_projected_traces(ocel_filename: str, object_type: str, build_if_non_existent: bool = True) -> List[Tuple[List[str], int]] | None:
    cache = get_long_term_cache()
    if cache.has(ocel_filename, projected_log_traces(object_type)):
        return cache.get(ocel_filename, projected_log_traces(object_type))

    if not build_if_non_existent:
        return None  # Abort if we should not create the traces now.

    # Create the traces:
    event_log = get_projected_event_log(ocel_filename, object_type)
    traces = [(variant, len(cases)) for (variant, cases) in pm4py.get_variants_as_tuples(event_log).items()]
    cache.set(ocel_filename, projected_log_traces(object_type), traces)
    return traces


def ensure_that_all_event_projected_logs_exist(ocel_filename: str):
    cache = get_long_term_cache()
    meta = get_metadata(ocel_filename, build_if_non_existent=False)
    if meta is None:
        project_ocel(ocel_filename, build_metadata=True)
    else:
        for object_type in meta.object_types:
            if not cache.has(ocel_filename, projected_log(object_type),
                             value_type=LongTermCacheEntryType.CLASSIC_EVENT_LOG):
                project_ocel(ocel_filename, build_metadata=False)
                return


def get_projected_event_log(ocel_filename: str, object_type: str, project_if_non_existent: bool = True) -> EventLog | None:
    cache = get_long_term_cache()
    if cache.has(ocel_filename, projected_log(object_type), LongTermCacheEntryType.CLASSIC_EVENT_LOG):
        return cache.get(ocel_filename, projected_log(object_type), LongTermCacheEntryType.CLASSIC_EVENT_LOG)

    if not project_if_non_existent:
        return None

    meta = get_metadata(ocel_filename, build_if_non_existent=False)
    if meta is None:
        projected_logs = project_ocel(ocel_filename)
        if object_type not in projected_logs:
            raise ValueError(f"Object type {object_type} does not exist in {ocel_filename}!")
        return projected_logs[object_type]

    if object_type not in meta.object_types:
        raise ValueError(f"Object type {object_type} does not exist in {ocel_filename}!")

    return project_ocel(ocel_filename)[object_type]


def get_metadata(ocel_filename: str, build_if_non_existent: bool = True) -> OCELMetadata | None:
    cache = get_long_term_cache()
    if cache.has(ocel_filename, metadata()):
        return OCELMetadata(**cache.get(ocel_filename, metadata()))

    if build_if_non_existent:
        ocel: OCEL = ocel_import_factory.apply(ocel_filename)
        return __build_metadata(ocel_filename, ocel)
    else:
        return None


def project_ocel(ocel_filename: str, build_metadata: bool = True) -> Dict[str, EventLog]:
    cache = get_long_term_cache()

    ocel: OCEL = ocel_import_factory.apply(ocel_filename)
    if build_metadata:
        __build_metadata(ocel_filename, ocel)

    # Prepare event log for projection to object types.
    df: DataFrame = ocel.log.log
    exploded_df = succint_mdl_to_exploded_mdl(df)

    result = {}
    for object_type in ocel.object_types:
        result[object_type] = project_log(exploded_df, object_type)
        cache.set(ocel_filename, projected_log(object_type), result[object_type],
                  LongTermCacheEntryType.CLASSIC_EVENT_LOG)
    return result


def load_projected_event_logs(ocel_filename: str) -> Dict[str, EventLog] | None:
    cache = get_long_term_cache()
    if not cache.has(ocel_filename, metadata()):
        return None

    object_types = OCELMetadata(**cache.get(ocel_filename, metadata())).object_types
    result = {}
    for object_type in object_types:
        result[object_type] = cache.get(ocel_filename, projected_log(object_type),
                                        LongTermCacheEntryType.CLASSIC_EVENT_LOG)
    return result


def __build_metadata(ocel_filename: str, ocel: OCEL) -> OCELMetadata:
    cache = get_long_term_cache()
    result = OCELMetadata(object_types=list(ocel.object_types))
    cache.set(ocel_filename, metadata(), result)
    return result
