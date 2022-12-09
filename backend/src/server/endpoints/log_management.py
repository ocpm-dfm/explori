import os
import shutil
from typing import List

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from starlette import status

from server.task_manager import TaskStatus
from cache import get_long_term_cache

router = APIRouter(prefix='/logs',
                   tags=['Log management'])


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
            if os.path.isfile(complete_path) and (node.endswith(".jsonocel") or node.endswith(".xmlocel")):
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
    file_location = "./data/uploaded/" + file.filename
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
    file_path_extended = "data/" + file_path
    # Delete ocel and corresponding cache folder
    if os.path.exists(file_path_extended):
        os.remove(file_path_extended)
        cache = get_long_term_cache()
        folder = cache.get_folder(file_path_extended)
        try:
            shutil.rmtree(folder)
        except OSError as e:
            print("Error: %s - %s." % (e.filename, e.strerror))

    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found!")

    # Delete corresponding autosave
    autosave_path = "cache/sessions/autosave-" + uuid + ".json"
    if os.path.exists(autosave_path):
        os.remove(autosave_path)

    # Delete hardsaved sessions ? TODO: if sessions make it into the final product

    return {
        "status": "successful"
    }
