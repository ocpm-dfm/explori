import {ExploriNavbar} from "../../components/ExploriNavbar/ExploriNavbar";
import  "../../components/DefaultLayout/DefaultLayout.css";
import "./Help.css";
import React from "react";
import {Button} from "@mui/material";
import {getURI} from "../../hooks";
import {Link} from "react-router-dom";

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
    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar />
            <div className={"Help"}>
                <Button onClick={clearCache} sx={{'background-color': 'red', 'color': 'white'}}>
                    Panic button
                </Button>
            </div>
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