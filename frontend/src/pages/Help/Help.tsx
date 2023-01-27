import {ExploriNavbar} from "../../components/ExploriNavbar/ExploriNavbar";
import  "../../components/DefaultLayout/DefaultLayout.css";
import "./Help.css";
import React, {useState} from "react";
import {Button} from "@mui/material";
import {getURI} from "../../hooks";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Dialog from "@mui/material/Dialog";

async function clearCache(){
    const uri = getURI("/logs/clear_cache", {});
    await fetch(uri)
        .then((response) => response.json())
        .then((result) => {
            console.log("All cached data was deleted");
        })
        .catch(err => console.log("Error in deleting ..."));
    return "Successful";
}

interface Props {
    resetQueryState: any
}

function resetLocalStorage(){
    // set to demo ocel
    localStorage.setItem("explori-currentOcel", "uploaded/demo_ocel.jsonocel");
}

export function Help(props: Props) {

    const [panicButtonOpen, setPanicButtonOpen] = useState(false);
    const [localStorageOpen, setLocalStorageOpen] = useState(false);
    const [resetQueryOpen, setResetQueryOpen] = useState(false);

    const panicButtonText = (
        <React.Fragment>
            <p>
                This button completely clears the long term cache (on your drive) and also the redis cache containing tasks. Once deleted, they can't be restored
                and for each OCEL all computations need to be redone. The purpose of this button is to try to trouble-shoot if something has gone seriously wrong.
            </p>
            <p>
                Only press yes, if you know what you are doing.
            </p>
        </React.Fragment>
    )

    const panicButtonTitle = "Do you really want to clear the whole cache?"

    const panicButtonDialog = helpDialog(panicButtonOpen, setPanicButtonOpen, panicButtonText, panicButtonTitle, clearCache)

    const localStorageText = (
        <React.Fragment>
            <p>
                This button resets the "explori-currentOcel" item in the local storage. Once you go back and refresh the Homepage, the default ocel should be shown again.
                The purpose of this button is to try to trouble-shoot if something has gone seriously wrong.
            </p>
            <p>
                Only press yes, if you know what you are doing.
            </p>
        </React.Fragment>
    )

    const localStorageTitle = "Do you really want to reset the local storage item?"

    const localStorageDialog = helpDialog(localStorageOpen, setLocalStorageOpen, localStorageText, localStorageTitle, resetLocalStorage)

    const resetQueryText = (
        <React.Fragment>
            <p>
                This button resets the DFM, Alignments and Performance Metrics queries.
                The purpose of this button is to try to trouble-shoot if something has gone seriously wrong.
            </p>
            <p>
                Only press yes, if you know what you are doing.
            </p>
        </React.Fragment>
    )

    const resetQueryTitle = "Do you really want to reset the current query states?"

    const resetQueryDialog = helpDialog(resetQueryOpen, setResetQueryOpen, resetQueryText, resetQueryTitle, props.resetQueryState)

    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar />
            <div className={"Help"}>
                <Button onClick={() => setPanicButtonOpen(true)} sx={{'background-color': 'red', 'color': 'white'}}>
                    Panic button
                </Button>
            </div>
            {panicButtonDialog}
            <Button onClick={() => setResetQueryOpen(true)}>Clear queries</Button>
            {resetQueryDialog}
            <Button onClick={() => {setLocalStorageOpen(true);}}>Reset localStorage</Button>
            {localStorageDialog}
            <Button>
                <a href="http://localhost:8080/docs" target="_blank">
                    Docs
                </a>
            </Button>
        </div>
    );
}

function helpDialog(open: boolean, setOpen: { (value: React.SetStateAction<boolean>): void; }, text: any, title: any, onClick: any){
    return (
        <Dialog
            open={open}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                {title}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {text}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)} autoFocus>No</Button>
                <Button onClick={() => {
                    onClick();
                    setOpen(false);
                }}>Yes</Button>
            </DialogActions>
        </Dialog>
    )
}