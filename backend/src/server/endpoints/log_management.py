import os
from typing import List

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from server.task_manager import TaskStatus

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
            "dir/file.ocel", 
            "420"
        ]
        
    }
