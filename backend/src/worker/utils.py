import json
import os
import pprint
from pathlib import PureWindowsPath
from typing import Dict, List, Tuple, Any

import pm4py
from fastapi import HTTPException
from ocpa.algo.util.util import project_log
from ocpa.objects.log.importer.csv.util import succint_mdl_to_exploded_mdl
from ocpa.objects.log.ocel import OCEL
from ocpa.objects.log.importer.ocel import factory as ocel_import_factory
from ocpa.objects.log.importer.csv import factory as ocel_import_factory_csv
from pandas import DataFrame
from pandas.core.groupby import DataFrameGroupBy
from pm4py.objects.log.obj import EventLog
from pydantic import BaseModel
from starlette import status

from cache import get_long_term_cache, projected_log, projected_log_traces, metadata, LongTermCacheEntryType
from server.endpoints.log_management import CSV


class OCELMetadata(BaseModel):
    object_types: List[str]


def get_all_projected_traces(ocel_filename: str, build_if_non_existent: bool = True) -> Dict[str, List[Tuple[List[str], int, List[List[int]]]]] | None:
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


def get_projected_traces(ocel_filename: str, object_type: str, build_if_non_existent: bool = True) -> List[Tuple[List[str], int, List[List[int]]]] | None:
    cache = get_long_term_cache()
    if cache.has(ocel_filename, projected_log_traces(object_type)):
        return cache.get(ocel_filename, projected_log_traces(object_type))

    if not build_if_non_existent:
        return None  # Abort if we should not create the traces now.

    # Create the traces:
    event_log: EventLog = get_projected_event_log(ocel_filename, object_type)
    event_log: DataFrame = pm4py.convert_to_dataframe(event_log)
    event_log: DataFrameGroupBy = event_log.groupby("case:concept:name")

    trace_event_ids: Dict[Any, List[List[int]]] = {}
    for (case_id, case) in event_log:
        trace = tuple(case['concept:name'].values)

        # Initialize the state for this trace if it does not exist yet.
        trace_event_ids.setdefault(trace, [[] for _ in range(len(trace))])

        for (i, (_, event)) in enumerate(case.iterrows()):
            trace_event_ids[trace][i].append(event['event_id'])

    # traces: List[(Activities, nr_cases, event_ids_for_each_activity)]
    traces = [(trace, len(event_ids[0]), event_ids) for (trace, event_ids) in trace_event_ids.items()]

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
        ocel: OCEL = get_ocel(ocel_filename)
        return __build_metadata(ocel_filename, ocel)
    else:
        return None


def project_ocel(ocel_filename: str, build_metadata: bool = True) -> Dict[str, EventLog]:
    cache = get_long_term_cache()
    ocel: OCEL = get_ocel(ocel_filename)

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


def get_ocel(ocel_filename: str) -> OCEL:
    """
    This function returns the OCEL for the given ocel file name.
    If a csv OCEL is selected, fetches the csv column mappings to import it.
    :param ocel_filename: File name of the OCEL to import.
    :return: Imported OCEL.
    """
    # Use saved csv column data to properly import OCEL
    if ocel_filename.split(".")[-1] == "csv":
        csv_path = get_csv_file_name(ocel_filename)
        if not os.path.isfile(csv_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown csv columns mapping.")

        with open(csv_path, 'r') as f:
            csv = CSV(**json.load(f))
            parameters = {"obj_names": csv.objects,
                          "val_names": [],
                          "act_name": csv.activity,
                          "time_name": csv.timestamp,
                          "sep": csv.separator}
            return ocel_import_factory_csv.apply(file_path=ocel_filename, parameters=parameters)
    else:
        return ocel_import_factory.apply(ocel_filename)


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

def get_csv_file_name(ocel_filename: str):
    """
    Determines the file to restore the csv data from. Prevents path traversals.
    :param ocel_filename: Name of the csv OCEL.
    :return: Path to the csv file.
    """
    cache = get_long_term_cache()
    folder = cache.get_folder(ocel_filename)
    csv_path_unvalidated = os.path.join("cache", "csv_columns", folder.split(os.sep)[-1] + ".json")

    # The backend might run on windows which results in a mixture of windows and posix paths (as we simply use strings as path representations for now)
    # If the path is a posix path, then the following transformation has no effect. If the path is a windows path, then afterwards it will be a posix path
    csv_path_unvalidated = PureWindowsPath(csv_path_unvalidated).as_posix()
    csv_file = PureWindowsPath(os.path.abspath(csv_path_unvalidated)).as_posix()

    if csv_file[-len(csv_path_unvalidated):] != csv_path_unvalidated:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Path traversals are not allowed!")
    return csv_file
