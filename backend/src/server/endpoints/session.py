import json
import os
from typing import List, Tuple
from pathlib import PureWindowsPath

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette import status

router = APIRouter(prefix="/session", tags=['Session management'])


SESSIONS_FOLDER = os.path.join("cache", "sessions")
os.makedirs(SESSIONS_FOLDER, exist_ok=True)


class Session(BaseModel):
    base_ocel: str
    threshold: float
    object_types: List[str]
    highlighting_mode: str | None = None
    graph_horizontal: bool = False
    legend_position: str = "top-left"
    alignment_mode: str = "none"
    edge_label: dict = {
        "metric": "count",
        "aggregate": "sum"
    }

    class Config:
        schema_extra = {
            "example": {
                "base_ocel": "uploaded/p2p-normal.jsonocel",
                "threshold": 0.8
            }
        }


class StoreSessionPayload(BaseModel):
    name: str
    session: Session


@router.put('/store')
async def store_session(payload: StoreSessionPayload):
    """
    Stores the provided session on disk.
    :param payload: Session to store
    :return: Successful status
    """
    session_file = get_session_file(payload.name)
    with open(session_file, 'w') as f:
        json.dump(payload.session.dict(), f)
    return {'status': 'successful'}


@router.get('/restore', response_model=Session)
def restore_session(name: str) -> Session:
    """
    Restore a session from disk by name.
    :param name: Name of session to restore
    :return: Restored session
    """
    session_file = get_session_file(name)
    if not os.path.isfile(session_file):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown session.")

    with open(session_file, 'r') as f:
        return Session(**json.load(f))

@router.get('/delete')
def delete_session(name: str):
    """
    This function deletes a single session.
    :param name: Name of the session to be deleted.
    :return: Status successful
    """
    session_file = get_session_file(name)
    if not os.path.isfile(session_file):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown session file.")

    os.remove(session_file)

    return {
        "status": "successful"
    }


class AvailableSessionsResponseModel(BaseModel):
    __root__: List[Tuple[str, float, str, float, List[str], str, dict]]

    class Config:
        schema_extra = {
            "example": [
                ["default", 1670149085]
            ]
        }


@router.get('/available', response_model=AvailableSessionsResponseModel)
def list_available_sessions():
    """
    Lists all available Sessions and returns them as list of strings that can be used to access them using other
    API endpoints.
    :return: List of available sessions containing information like used ocel, etc.
    """

    if not os.path.isdir(SESSIONS_FOLDER):
        return []

    result = []
    def find_available_logs(folder: str) -> List[str]:
        results = []
        for node in os.listdir(folder):
            complete_path = os.path.join(folder, node)
            if os.path.isfile(complete_path) and (
                    node.endswith(".jsonocel") or node.endswith(".xmlocel") or node.endswith(".csv")):
                results.append(os.path.join(folder, node)[5:])
            elif os.path.isdir(complete_path):
                results.extend(find_available_logs(complete_path))
        return results

    logs = find_available_logs("data")
    for file in os.listdir(SESSIONS_FOLDER):
        if file.endswith(".json"):
            session_name = file[:-5]
            last_change = os.path.getmtime(os.path.join(SESSIONS_FOLDER, file))
            # Get ocel and threshold information
            session_file = get_session_file(session_name)
            if not os.path.isfile(session_file):
                #raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wrong files in session storage.")
                continue

            with open(session_file, 'r') as f:
                session = Session(**json.load(f))
            if session.base_ocel in logs:
                result.append((session_name, last_change, session.base_ocel, session.threshold, session.object_types, session.alignment_mode, session.edge_label))
    return result


def get_session_file(session_name: str):
    """
    Determines the file to store the session to. Prevents path traversals.
    :param session_name: Name of session for which to create a session file path
    :return: Session file path
    """

    session_file_unvalidated = os.path.join(SESSIONS_FOLDER, session_name + ".json")

    # The backend might run on windows which results in a mixture of windows and posix paths (as we simply use strings as path representations for now)
    # If the path is a posix path, then the following transformation has no effect. If the path is a windows path, then afterwards it will be a posix path
    session_file_unvalidated = PureWindowsPath(session_file_unvalidated).as_posix()
    session_file = PureWindowsPath(os.path.abspath(session_file_unvalidated)).as_posix()

    if session_file[-len(session_file_unvalidated):] != session_file_unvalidated:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Path traversals are not allowed!")
    return session_file