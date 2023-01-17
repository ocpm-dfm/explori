import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import React from "react";
import {getURI} from "../../hooks";

type DeleteModalProps = {
    selectedSession: string | null,
    afterDelete: () => Promise<void>
    onClose: () => void
}


export const DeleteSessionModal = (props: DeleteModalProps) => {
    const open = props.selectedSession !== null;

    async function onDelete() {
        if (props.selectedSession !== null) {
            const uri = getURI("/session/delete", {name: props.selectedSession});
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
                {"Do you really want to delete the saved session?"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {   props.selectedSession &&
                        props.selectedSession.split("-")[0] === "autosave" &&
                        (
                            <React.Fragment>
                                <p>
                                    If you decide to delete the session "{props.selectedSession}", the corresponding autosave to the event log will be deleted and the next time
                                    you load that event log, all your settings will be lost and reset.
                                </p>
                                <p>
                                    Only press yes, if you know what you are doing.
                                </p>
                            </React.Fragment>
                        )
                    }
                    {   props.selectedSession &&
                        props.selectedSession.split("-")[0] !== "autosave" &&
                        (
                            <React.Fragment>
                                <p>
                                    If you decide to delete the session "{props.selectedSession}", it can't be restored.
                                </p>
                                <p>
                                Only press yes, if you know what you are doing.
                                </p>
                            </React.Fragment>
                        )
                    }


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

