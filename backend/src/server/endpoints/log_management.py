import os
import json
import shutil
from pathlib import PureWindowsPath, Path

import pandas as pd
from typing import List

import json
import copy
from lxml import etree, objectify
from pandas.api.types import is_integer_dtype

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from starlette import status

from server.task_manager import TaskStatus
from cache import get_long_term_cache, get_short_term_cache
from server.endpoints.session import SESSIONS_FOLDER, get_session_file, Session

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
def list_available_logs():
    """
    Lists all available OCELS and returns them as list of strings that can be used to access them using other
    API endpoints. Additionally, the file size is returned. OCELs that were uploaded by the user over the web
    interface will be prefixed by "uploaded/".
    :return: String list containing paths of available ocels
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
    """
    This function handles the uploading of OCELs. It also ensures that .jsonocel and .xmlocel OCELs
    have the correct Event ID format since OCPA does not like string event IDs (at least v1.2).
    :param file: File to be uploaded as fastapi UploadFile
    :return: Returns successful status and file path + file size
    """
    upload_folder_location = "." + os.sep + "data" + os.sep + "uploaded"
    Path(upload_folder_location).mkdir(parents=True, exist_ok=True)

    file_location = upload_folder_location + os.sep + file.filename
    file_content = await file.read()
    with open(file_location, "wb") as f:
        f.write(file_content)

    if file.filename.split(".")[-1] == "jsonocel":

        with open(file_location) as f:
            data = json.load(f)
            new_data = copy.deepcopy(data)
            has_string_value = False
            for item in data['ocel:events']:
                try:
                    int(item)
                except ValueError:
                    has_string_value = True
                    break

            if has_string_value:
                for i, item in enumerate(data['ocel:events']):
                    new_data['ocel:events'][i] = new_data['ocel:events'].pop(item)

                with open(file_location, "w") as new_f:
                    json.dump(new_data, new_f, indent=4)

    elif file.filename.split(".")[-1] == "xmlocel":
        parser = etree.XMLParser(remove_comments=True)
        tree = objectify.parse(file_location, parser=parser)
        root = tree.getroot()
        i = 0
        for child in root:
            if child.tag.lower().endswith("events"):
                for event in child:
                    for child2 in event:
                        if child2.get("key") == "id":
                            try:
                                int(child2.get("value"))
                            except ValueError:
                                child2.attrib['value'] = str(i)
                                i += 1

        et = etree.ElementTree(root)
        et.write(file_location, pretty_print=True)

    # Since we do not know which column is used as id in csv files and we do not want to assume that,
    # changing type of the id column is done when we select the csv file and chose the id column

    return {
        "status": "successful",
        "data": [
            "uploaded/" + file.filename,
            round(os.stat(file_location).st_size / 1024, 0)
        ]

    }

def delete(file_path: str, uuid: str, delete_log: bool):
    """
    This function handles deletion of uploaded OCELs. It does so by removing the OCEL, cache folder,
    autosave and hardsaved sessions.
    :param file_path: Path to the file to be deleted
    :param uuid: The UUID of the OCEL which being is deleted. Needed to delete the corresponding cache.
    :param delete_log: Boolean to decide whether to delete the log. Useful when one just wants to clear
    everything except the OCEL.
    """
    file_path_extended = "data" + os.sep + file_path
    # Delete ocel and corresponding cache folder
    if os.path.exists(file_path_extended):
        if delete_log:
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

    # Delete hardsaved sessions
    for file in os.listdir(SESSIONS_FOLDER):
        if file.endswith(".json"):
            session_name = file[:-5]
            # Get ocel name
            session_file = get_session_file(session_name)
            if not os.path.isfile(session_file):
                # raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wrong files in session storage.")
                continue

            with open(session_file, 'r') as f:
                session = Session(**json.load(f))
                if session.base_ocel == file_path:
                    os.remove(session_file)

@router.get('/delete')
def delete_event_log(file_path: str, uuid: str):
    """
    API endpoint for the frontend to access when deleting an OCEL.
    :param file_path: Path to the file to be deleted
    :param uuid: The UUID of the OCEL which is being deleted. Needed to delete the corresponding cache.
    :return: Status successful
    """
    delete(file_path, uuid, True)
    return {
        "status": "successful"
    }

@router.get('/delete_cache')
def delete_event_log(file_path: str, uuid: str):
    """
    API endpoint for the frontend to access when clearing the cache of an OCEL.
    :param file_path: Path to the OCEL for which the cache should be cleared.
    :param uuid: The UUID of the OCEL. Needed to delete the corresponding cache.
    :return: Status successful
    """
    delete(file_path, uuid, False)
    return {
        "status": "successful"
    }

@router.get('/csv_columns', response_model=ColumnListResponseModel)
def get_csv_columns(file_path: str):
    """
    Returns the columns of the OCEL.
    :param file_path: Path to the csv OCEL for which the columns should be returned.
    :return: Columns of the OCEL
    """
    file_path_extended = "data" + os.sep + file_path

    if not os.path.isfile(file_path_extended):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a file.")

    dataframe = pd.read_csv(file_path_extended, sep=',')
    return list(dataframe.columns.values)

@router.get('/csv_data')
def get_csv_columns(file_path: str, n_columns: int):
    """
    Allows to fetch a certain number of rows in the csv OCEL to display them.
    :param file_path: Path to the csv OCEL for which the columns should be fetched.
    :param n_columns: Number of columns to fetch.
    :return: First n_columns rows of the csv OCEL.
    """
    file_path_extended = "data" + os.sep + file_path

    if not os.path.isfile(file_path_extended):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a file.")

    dataframe = pd.read_csv(file_path_extended, sep=',')
    return dataframe.head(n_columns).to_json(orient="index")

@router.put('/save_csv')
def save_csv_columns(payload: StoreCSVPayload):
    """
    This function saves the csv column mappings chosen in the frontend to a .json file.
    It also replaces the id column by a numeric values if that is not already the case.
    :param payload: The payload as StoreCSVPayload which should be stored.
    :return: Status successful
    """
    file_path_extended = "data" + os.sep + payload.name

    cache = get_long_term_cache()
    folder = cache.get_folder(file_path_extended)

    # We need "id" as id column, else import of csv fails
    # Right now, we manually change the id column to "id"
    df = pd.read_csv(file_path_extended)
    df.rename(columns={payload.csv.id: "id"}, inplace=True)
    # When id column does not have needed numeric format, we change it (random order)
    if not is_integer_dtype(df["id"]):
        df['id'] = df.id.astype('category').cat.rename_categories(range(0, df.shape[0]))
    df.to_csv(file_path_extended, index=None)

    csv_file = get_csv_file(folder.split(os.sep)[1])
    with open(csv_file, 'w') as f:
        json.dump(payload.csv.dict(), f)

    return {'status': 'successful'}

@router.get('/delete_csv_cache')
def delete_csv_cache(file_path: str, uuid: str):
    """
    This function is used to delete the cache and autosaves of csv OCEL which is called when
    the csv OCEL was selected and the column mappings are different from before.
    :param file_path: Path to the csv OCEL.
    :param uuid: UUID of the csv OCEL to retrieve the corresponding cache.
    :return: Status successful
    """
    file_path_extended = "data" + os.sep + file_path
    # Delete corresponding cache folder
    if os.path.exists(file_path_extended):
        cache = get_long_term_cache()
        folder = cache.get_folder(file_path_extended)
        try:
            shutil.rmtree(folder)
        except OSError as e:
            print("Error: %s - %s." % (e.filename, e.strerror))

    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found!")

    # Delete corresponding autosave
    autosave_path = "cache" + os.sep + "sessions" + os.sep + "autosave-" + uuid + ".json"
    if os.path.exists(autosave_path):
        os.remove(autosave_path)

    return {
        "status": "successful"
    }

@router.get('/clear_cache')
def delete_cache():
    """
    This function is used to trouble-shoot Explori and fully clear the cache. This includes all OCEL
    caches, csv column mappings, session saves and the redis tasks.
    :return: Status successful
    """
    dir_path = "cache"
    # clear all OCEL caches
    for directory in [x[0] for x in os.walk(dir_path)]:
        if directory != dir_path and directory != dir_path + os.sep + "csv_columns" and directory != dir_path + os.sep + "sessions":
            try:
                shutil.rmtree(directory)
            except OSError as e:
                print("Error: %s - %s." % (e.filename, e.strerror))

    # clear csv_columns:
    csv_dir_path = dir_path + os.sep + "csv_columns"
    for directory in [x[2] for x in os.walk(csv_dir_path)]:
        for file in directory:
            try:
                os.remove(csv_dir_path + os.sep + file)
            except OSError as e:
                print("Error: %s - %s." % (e.filename, e.strerror))

    # Clear autosaves
    autosave_dir_path = "cache" + os.sep + "sessions"
    for directory in [x[2] for x in os.walk(autosave_dir_path)]:
        for file in directory:
            try:
                os.remove(autosave_dir_path + os.sep + file)
            except OSError as e:
                print("Error: %s - %s." % (e.filename, e.strerror))

    # Clear redis tasks
    redis = get_short_term_cache()
    redis.clear_cache()

    return {
        "status": "successful"
    }

@router.get('/restore', response_model=CSV)
def restore_csv_data(name: str) -> CSV:
    """
    This function is used to restore the stored csv column mapping.
    :param name: File path of the csv OCEL.
    :return: Returns csv column mappings in the form of CSV.
    """
    file_path_extended = "data" + os.sep + name

    cache = get_long_term_cache()
    folder = cache.get_folder(file_path_extended)

    csv_file = get_csv_file(folder.split(os.sep)[1])
    if not os.path.isfile(csv_file):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown column mappings file.")

    with open(csv_file, 'r') as f:
        return CSV(**json.load(f))

def get_csv_file(ocel_name: str):
    """
    Determines the file to store the csv data to. Prevents path traversals.
    :param ocel_name: Name of the csv OCEL.
    :return: Path to the csv file.
    """
    csv_file_unvalidated = os.path.join(CSV_FOLDER, ocel_name + ".json")

    # The backend might run on windows which results in a mixture of windows and posix paths (as we simply use strings as path representations for now)
    # If the path is a posix path, then the following transformation has no effect. If the path is a windows path, then afterwards it will be a posix path
    csv_file_unvalidated = PureWindowsPath(csv_file_unvalidated).as_posix()
    csv_file = PureWindowsPath(os.path.abspath(csv_file_unvalidated)).as_posix()

    if csv_file[-len(csv_file_unvalidated):] != csv_file_unvalidated:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Path traversals are not allowed!")
    return csv_file
