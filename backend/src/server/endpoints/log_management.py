import os
from typing import List

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

router = APIRouter(prefix='/logs',
                   tags=['Log management'])


# region /available
class AvailableLogsResponseModel(BaseModel):
    __root__: List[str]
    class Config:
        schema_extra = {
            "example": [
                "uploaded/p2p-normal.jsonocel",
                "mounted/b2c-unfiltered.csv"
            ]
        }

@router.get('/available', response_model=AvailableLogsResponseModel)
def list_available_logs() -> List[str]:
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

    # Find all logs in the data folder.
    logs = find_available_logs("data")

    # Cut of the data/ from the log names
    logs = [log[5:] for log in logs]

    return logs
# endregion

@router.put('/upload')
async def upload_event_logs(file: UploadFile):
    fileLocation = file.filename
    fileContent = await file.read()
    with open(fileLocation, "wb") as f:
        f.write(fileContent)

    return {
        "status": "successful"
    }
