import './Session.css';
import {Dispatch, RefObject, SetStateAction, useEffect, useState} from 'react';
import { getURI } from '../../hooks';
import { Button, TextField, Stack, CircularProgress } from "@mui/material";
import {RootState} from "../../redux/store";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {EventLogMetadata} from "../../redux/EventLogs/eventLogs.types";
import {addEventLog} from "../../redux/EventLogs/eventLogs.actions";
import {connect} from "react-redux";
import {formatEventLogMetadata} from "../../redux/EventLogs/eventLogs.utils";

interface SessionProps {
    setSelected: Dispatch<SetStateAction<number | null>>;
}

const mapStateToProps = (state: RootState, props: SessionProps) => ({})
const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, props: SessionProps) => ({
    addEventLog: (eventLog: EventLogMetadata) => {
        dispatch(addEventLog(eventLog))
    }
});

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ReturnType<typeof mapDispatchToProps>;
type Props = SessionProps & StateProps & DispatchProps;

export const Session = connect<StateProps, DispatchProps, SessionProps, RootState>(mapStateToProps, mapDispatchToProps)(
    (props: Props) => {
    /*
    TODO: implement selectedFile, isFileSelected, fileStatus again
    FIX: disabled attribute in upload button
    */

    const initialSelectedFile: any = {}
    const [selectedFile, setSelectedFile] = useState(initialSelectedFile);
    const [loading, setLoading] = useState(false);
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
        event.preventDefault();

        if (!loading) {
            setLoading(true);
        }

        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadFileUrl: string = getURI('/logs/upload', {})

        fetch(uploadFileUrl, {
            method: 'PUT',
            body: formData
        })
            .then((response) => response.json())
            .then((result) => {
                if (result.status === "successful") {
                    const eventLogMetadata = formatEventLogMetadata(result.data)
                    props.addEventLog(eventLogMetadata);
                    if ("id" in eventLogMetadata) {
                        const processedMetadata = eventLogMetadata as unknown as {id: number};
                        props.setSelected(processedMetadata.id);
                    }


                }
                setLoading(false);
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
                        disabled={loading}
                        onClick={uploadFile} >
                        Confirm Upload
                    </button>
                </Button>
                {loading && (
                    <CircularProgress
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-12px',
                            marginLeft: '-12px',
                        }}
                    />
                )}
            </form>
            </Stack>
        </div>
    )
});