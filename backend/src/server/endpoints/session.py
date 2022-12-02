import os

from fastapi import APIRouter, UploadFile
from fastapi.responses import FileResponse
from typing import List, Dict

from pydantic import BaseModel

router = APIRouter(prefix="/session", tags=['Session management'])


class AvailableSessionsResponseModel(BaseModel):
    __root__: List[List[str]]

    class Config:
        schema_extra = {
            "example": [
                "session1",
                "session2"
            ]
        }


class RestoreResponseModel(BaseModel):
    __root__ = Dict[str, (str | FileResponse)]


class StoreSessionResponseModel(BaseModel):
    __root__: Dict[str, bool]

    class Config:
        schema_extra = {
            "example": [
                "session1",
                "session2"
            ]
        }


class RestoreSessionResponseModel(BaseModel):
    __root__: List[List[str]]

    class Config:
        schema_extra = {
            "example": [
                "session1",
                "session2"
            ]
        }


@router.put('/store', response_model=StoreSessionResponseModel)
async def upload_session_file(file: UploadFile):
    file_location = "/cache/sessions/" + file.filename
    file_content = await file.read()
    with open(file_location, "wb") as f:
        f.write(file_content)



    return {'status': 'successful'}


@router.get('/restore', response_model=RestoreSessionResponseModel)
def restore_session(file_name: str) -> Dict[str, (str | FileResponse)]:
    file_location = "/cache/sessions" + file_name
    return {
        'status': 'successful',
        'file': FileResponse(file_location)
    }


@router.get('/available', response_model=AvailableSessionsResponseModel)
def list_available_sessions():
    """
        Lists all available Sessions and returns them as list of strings that can be used to access them using other
        API endpoints.
    """

    def find_available_sessions(folder: str) -> List[str]:
        result = []
        for node in os.listdir(folder):
            complete_path = os.path.join(folder, node)
            if os.path.isfile(complete_path) and (node.endswith(".json")):
                result.append(os.path.join(folder, node))
            elif os.path.isdir(complete_path):
                result.extend(find_available_sessions(complete_path))
        return result

    # Cut of the data/ from the log names
    def cut_filename(filename: str):
        return filename[15:]

    def extend_result_by_date(session: List[str]):
        results = []
        for entry in session:
            results.append([cut_filename(entry), os.path.getmtime(entry)])
        return results

    # Find all logs in the data folder.
    sessions = find_available_sessions("cache/sessions")

    # Extend results by file size
    extended_logs = extend_result_by_date(sessions)

    return extended_logs
