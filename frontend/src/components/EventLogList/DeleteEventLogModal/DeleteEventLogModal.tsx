import {EventLogMetadata} from "../../../redux/EventLogs/eventLogs.types";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import React from "react";
import {getURI} from "../../../hooks";
import getUuid from "uuid-by-string";


type DeleteModalProps = {
    selectedEventLog: EventLogMetadata | null,
    afterDelete: () => Promise<void>
    onClose: () => void
}


export const DeleteEventLogModal = (props: DeleteModalProps) => {
    const open = props.selectedEventLog !== null;

    async function onDelete() {
        if (props.selectedEventLog !== null) {
            const ocel = props.selectedEventLog.full_path;
            const uri = getURI("/logs/delete", {file_path: ocel, uuid: getUuid(ocel)});
            await fetch(uri)
                .then((response) => response.json())
                .then((result) => {
                    props.afterDelete();
                })
                .catch(err => console.log("Error in deleting ..."));
        }

    }

    return (
        <Dialog
            open={open}
            onClose={props.onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                {"Do you really want to delete the selected OCEL?"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    If you decide to delete the selected OCEL, also all corresponding data like
                    caches, autosaves, etc. will be deleted.
                    Only press yes, if you know what you are doing.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose} autoFocus>No</Button>
                <Button onClick={() => {
                    onDelete();
                    props.onClose();
                }}>
                    Yes
                </Button>
            </DialogActions>
        </Dialog>
    )
}

