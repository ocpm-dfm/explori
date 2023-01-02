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
    highlighting_mode: str | None

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
    session_file = get_session_file(payload.name)
    with open(session_file, 'w') as f:
        json.dump(payload.session.dict(), f)
    return {'status': 'successful'}


@router.get('/restore', response_model=Session)
def restore_session(name: str) -> Session:
    session_file = get_session_file(name)
    if not os.path.isfile(session_file):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown session.")

    with open(session_file, 'r') as f:
        return Session(**json.load(f))


class AvailableSessionsResponseModel(BaseModel):
    __root__: List[Tuple[str, float, str, float]]

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
    """

    if not os.path.isdir(SESSIONS_FOLDER):
        return []

    result = []
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
            result.append((session_name, last_change, session.base_ocel, session.threshold))
    return result


def get_session_file(session_name: str):
    """Determines the file to store the session to. Prevents path traversals."""

    session_file_unvalidated = os.path.join(SESSIONS_FOLDER, session_name + ".json")

    # The backend might run on windows which results in a mixture of windows and posix paths (as we simply use strings as path representations for now)
    # If the path is a posix path, then the following transformation has no effect. If the path is a windows path, then afterwards it will be a posix path
    session_file_unvalidated = PureWindowsPath(session_file_unvalidated).as_posix()
    session_file = PureWindowsPath(os.path.abspath(session_file_unvalidated)).as_posix()

    if session_file[-len(session_file_unvalidated):] != session_file_unvalidated:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Path traversals are not allowed!")
    return session_file