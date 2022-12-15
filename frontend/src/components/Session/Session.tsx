import './Session.css';
import {RefObject, useEffect, useState} from 'react';
import { getURI } from '../../api';
import {Button, TextField, Stack} from "@mui/material";

export function Session(_props: any) {
    /*
    TODO: implement selectedFile, isFileSelected, fileStatus again
    FIX: disabled attribute in upload button
    */

    const compare = _props.compare
    const dataSource = _props.dataSource
    const setDataSource = _props.setDataSource
    const setSelected = _props.setSelected
    const formatEventLogMetadata = _props.formatEventLogMetadata

    const initialSelectedFile: any = {}
    const [selectedFile, setSelectedFile] = useState(initialSelectedFile)
    //const [isFileSelected, setIsFileSelected] = useState(false)
    //const [fileStatus, setFileStatus] = useState("")

    useEffect(() => {
        /*
        setIsFileSelected('name' in selectedFile)
        if ('name' in selectedFile) {
            setFileStatus("Selected file ready to be uploaded")
        }
        */
    }, [selectedFile])

    const handleFileSelection = async (event: any) => {
        event.preventDefault()
        setSelectedFile(event.target.files[0])
    }

    const uploadFile = async (event: any) => {
        event.preventDefault()

        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadFileUrl: string = getURI('/logs/upload', {})
        console.log(uploadFileUrl + ": " + uploadFileUrl)
        fetch(uploadFileUrl, {
            method: 'PUT',
            body: formData
        })
            .then((response) => response.json())
            .then((result) => {
                if (result.status === "successful") {
                    const eventLogMetadata = formatEventLogMetadata(result.data);
                    eventLogMetadata.id = dataSource.length + 1;
                    let newDataSource = [
                        ...dataSource,
                        eventLogMetadata
                    ]
                    newDataSource = newDataSource.sort(compare);

                    for (let i = 0; i < newDataSource.length; i++){
                        newDataSource[i].id = i;
                    }

                    setDataSource(newDataSource);
                    setSelected(eventLogMetadata.id);
                }
            })
            .catch(err => console.log("Error in uploading ..."))

    }

    return (
        <div className="Session">
            <Stack spacing={3} direction="row" justifyContent="flex-end">
            <TextField
                sx={{'top': '10px', 'color': 'rgb(var(--color1))'}}
                id="standard-read-only-input"
                value={selectedFile.name}
                InputProps={{
                   readOnly: true,
                }}
                variant="standard"
            />
            <form id="uploadEventLogForm">
                { /* <label htmlFor="uploadEventLog">Upload an event log:</label> */ }
                <Button variant="contained" component="label" sx={{'top': '10px', 'background-color': 'rgb(var(--color1))'}}>
                    Upload
                    <input
                        type="file"
                        hidden
                        accept=".jsonocel, .xmlocel, .csv"
                        name="uploadEventLog"
                        onChange={handleFileSelection}
                    >
                    </input>
                </Button>

                {
                    //FIX: <div>{fileStatus}</div>
                }
                <Button variant="contained" component="label" sx={{ 'top': '10px', 'margin-left': '10px', 'background-color': 'rgb(var(--color1))' }}>
                    Confirm upload
                    <button
                        form='uploadEventLogForm'
                        hidden
                        disabled={false}
                        onClick={uploadFile} >
                        Confirm Upload
                    </button>
                </Button>
            </form>
            </Stack>
        </div>
    )
}