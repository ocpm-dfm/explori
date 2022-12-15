import os
import json
import shutil
from pathlib import PureWindowsPath

import pandas as pd
from typing import List

from ocpa.objects.log.importer.csv import factory as ocel_import_factory

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from starlette import status

from server.task_manager import TaskStatus
from cache import get_long_term_cache

router = APIRouter(prefix='/logs',
                   tags=['Log management'])

CSV_FOLDER = os.path.join("cache", "csv_columns")
os.makedirs(CSV_FOLDER, exist_ok=True)

class CSV(BaseModel):
    objects: List[str]
    activity: str
    timestamp: str
    id: str
    separator: str

    class Config:
        schema_extra = {
            "example": {
                "objects": [
                    "PURCHORD",
                    "PURCHREQ"
                ],
                "activity": "ocel:activity",
                "timestamp": "ocel:timestamp",
                "id": "ocel:id",
                "separator": ","
            }
        }
class StoreCSVPayload(BaseModel):
    name: str
    csv: CSV


# region /available
class AvailableLogsResponseModel(BaseModel):
    __root__: List[List[str | float]]
    class Config:
        schema_extra = {
            "example": [
                "uploaded/p2p-normal.jsonocel",
                "mounted/b2c-unfiltered.csv"
            ]
        }

class ColumnListResponseModel(BaseModel):
    __root__: List[str]
    class Config:
        schema_extra = {
            "example": [
                "ORDER",
                "CONTAINER",
                "REQ"
            ]
        }

@router.get('/available', response_model=AvailableLogsResponseModel)
def list_available_logs() -> TaskStatus:
    """
    Lists all available OCELS and returns them as list of strings that can be used to access them using other
    API endpoints. OCELs that were uploaded by the user over the web interface will be prefixed by "uploaded/".
    """
    def find_available_logs(folder: str) -> List[str]:
        result = []
        for node in os.listdir(folder):
            complete_path = os.path.join(folder, node)
            if os.path.isfile(complete_path) and (node.endswith(".jsonocel") or node.endswith(".xmlocel") or node.endswith(".csv")):
                result.append(os.path.join(folder, node))
            elif os.path.isdir(complete_path):
                result.extend(find_available_logs(complete_path))
        return result

    # Cut of the data/ from the log names
    def cut_filename(filename: str):
        return filename[5:]

    def extend_result_by_filesize(log: List[str]):
        results = []
        for entry in log:
            results.append([cut_filename(entry), round(os.stat(entry).st_size / 1024, 0)])
        return results

    # Find all logs in the data folder.
    logs = find_available_logs("data")

    # Extend results by file size
    extended_logs = extend_result_by_filesize(logs)

    return extended_logs
# endregion

@router.put('/upload')
async def upload_event_logs(file: UploadFile):
    file_location = "." + os.sep + "data" + os.sep + "uploaded" + os.sep + file.filename
    file_content = await file.read()
    with open(file_location, "wb") as f:
        f.write(file_content)

    return {
        "status": "successful",
        "data": [
            "uploaded/" + file.filename,
            round(os.stat(file_location).st_size / 1024, 0)
        ]

    }

@router.get('/delete')
def delete_event_log(file_path: str, uuid: str):
    file_path_extended = "data" + os.sep + file_path
    # Delete ocel and corresponding cache folder
    if os.path.exists(file_path_extended):
        os.remove(file_path_extended)
        cache = get_long_term_cache()
        folder = cache.get_folder(file_path_extended)
        try:
            shutil.rmtree(folder)
            # Delete csv column mappings when file is csv
            if file_path.split(".")[-1] == "csv":
                csv_file = get_csv_file(folder.split(os.sep)[1])
                os.remove(csv_file)
        except OSError as e:
            print("Error: %s - %s." % (e.filename, e.strerror))

    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found!")

    # Delete corresponding autosave
    autosave_path = "cache" + os.sep + "sessions" + os.sep + "autosave-" + uuid + ".json"
    if os.path.exists(autosave_path):
        os.remove(autosave_path)

    # Delete hardsaved sessions ? TODO: if sessions make it into the final product

    return {
        "status": "successful"
    }

@router.get('/csv_columns', response_model=ColumnListResponseModel)
def get_csv_columns(file_path: str):
    file_path_extended = "data" + os.sep + file_path

    if not os.path.isfile(file_path_extended):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a file.")

    dataframe = pd.read_csv(file_path_extended, sep=',')
    return list(dataframe.columns.values)

@router.get('/csv_data')
def get_csv_columns(file_path: str, n_columns: int):
    file_path_extended = "data" + os.sep + file_path

    if not os.path.isfile(file_path_extended):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a file.")

    dataframe = pd.read_csv(file_path_extended, sep=',')
    return dataframe.head(n_columns).to_json(orient="index")

@router.put('/save_csv')
def save_csv_columns(payload: StoreCSVPayload):
    file_path_extended = "data" + os.sep + payload.name

    cache = get_long_term_cache()
    folder = cache.get_folder(file_path_extended)

    # We need "id" as id column, else import of csv fails
    # Right now, we manually change the id column to "id"
    df = pd.read_csv(file_path_extended)
    df.rename(columns={payload.csv.id: "id"}, inplace=True)
    df.to_csv(file_path_extended, index=None)

    csv_file = get_csv_file(folder.split(os.sep)[1])
    with open(csv_file, 'w') as f:
        json.dump(payload.csv.dict(), f)

    return {'status': 'successful'}

def get_csv_file(ocel_name: str):
    """Determines the file to store the csv data to. Prevents path traversals."""

    csv_file_unvalidated = os.path.join(CSV_FOLDER, ocel_name + ".json")

    # The backend might run on windows which results in a mixture of windows and posix paths (as we simply use strings as path representations for now)
    # If the path is a posix path, then the following transformation has no effect. If the path is a windows path, then afterwards it will be a posix path
    csv_file_unvalidated = PureWindowsPath(csv_file_unvalidated).as_posix()
    csv_file = PureWindowsPath(os.path.abspath(csv_file_unvalidated)).as_posix()

    if csv_file[-len(csv_file_unvalidated):] != csv_file_unvalidated:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Path traversals are not allowed!")
    return csv_file



