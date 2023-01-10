import {ChangeEvent, ChangeEventHandler, Dispatch, SetStateAction, useState} from "react";
import {getURI} from "../../../hooks";
import {formatEventLogMetadata} from "../../../redux/EventLogs/eventLogs.utils";
import {RootState} from "../../../redux/store";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {EventLogMetadata} from "../../../redux/EventLogs/eventLogs.types";
import {addEventLog} from "../../../redux/EventLogs/eventLogs.actions";
import {connect} from "react-redux";

import './UploadLogButton.css';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faFileArrowUp} from "@fortawesome/free-solid-svg-icons";
import {CircularProgress} from "@mui/material";

type LogUploaderProps = {
    onUpload?: (eventLog: EventLogMetadata) => void

}

const mapStateToProps = (state: RootState, props: LogUploaderProps) => ({})
const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, props: LogUploaderProps) => ({
    addEventLog: (eventLog: EventLogMetadata) => {
        dispatch(addEventLog(eventLog))
    }
});

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ReturnType<typeof mapDispatchToProps>;
type Props = LogUploaderProps & StateProps & DispatchProps;

export const UploadLogButton = connect<StateProps, DispatchProps, LogUploaderProps, RootState>(mapStateToProps, mapDispatchToProps)(
    (props: Props) => {

    const [loading, setLoading] = useState<boolean>(false);

    const uploadFile = (event: ChangeEvent<HTMLInputElement>) => {
        if (!event.target || !event.target.files)
            return;

        if (event.target.files.length === 0)
            return;

        const formData = new FormData()
        formData.append('file', event.target.files[0])

        const uploadFileUrl: string = getURI('/logs/upload', {})

        setLoading(true);
        fetch(uploadFileUrl, {
            method: 'PUT',
            body: formData
        })
            .then((response) => response.json())
            .then((result) => {
                if (result.status === "successful") {
                    const eventLogMetadata = formatEventLogMetadata(result.data)
                    props.addEventLog(eventLogMetadata);
                    if (props.onUpload)
                        props.onUpload(eventLogMetadata);
                }
                setLoading(false);
            })
            .catch(err => console.log("Error in uploading ...", err))
    }

    return (
        <div className="LogUploader-FileSelect">
            <label  htmlFor="uploadEventLog">
                <FontAwesomeIcon icon={faFileArrowUp} />
                Upload OCEL
            </label>
            <input type="file" accept=".jsonocel, .xmlocel, .csv" id="uploadEventLog" hidden onChange={uploadFile}/>
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

        </div>
    )
});