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

export function Help(props: Props) {

    const [open, setOpen] = useState(false);

    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar />
            <div className={"Help"}>
                <Button onClick={() => setOpen(true)} sx={{'background-color': 'red', 'color': 'white'}}>
                    Panic button
                </Button>
            </div>
            <Dialog
                open={open}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {"Do you really want to clear the whole cache?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                            <p>
                                This button completely clears the long term cache (on your drive) and also the redis cache containing tasks. Once deleted, they can't be restored
                                and for each OCEL all computations need to be redone. The purpose of this button is to try to trouble-shoot if something has gone seriously wrong.
                            </p>
                            <p>
                                Only press yes, if you know what you are doing.
                            </p>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} autoFocus>No</Button>
                    <Button onClick={clearCache}>Yes</Button>
                </DialogActions>
            </Dialog>
            <Button onClick={props.resetQueryState}>Clear queries</Button>
            <Button onClick={() => {
                // set to demo ocel
                localStorage.setItem("explori-currentOcel", "uploaded/p2p-normal.jsonocel");
            }}>Reset localStorage</Button>
            <Button>
                <a href="http://localhost:8080/docs" target="_blank">
                    Docs
                </a>
            </Button>
        </div>
    );
}