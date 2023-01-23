import {ExploriNavbar} from "../../components/ExploriNavbar/ExploriNavbar";
import  "../../components/DefaultLayout/DefaultLayout.css";
import "./Help.css";
import React from "react";
import {Button} from "@mui/material";
import {getURI} from "../../hooks";
import getUuid from "uuid-by-string";

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

export function Help() {
    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar />
            <div className={"Help"}>
                <Button onClick={clearCache} sx={{'background-color': 'red', 'color': 'white'}}>
                    Panic button
                </Button>
            </div>
        </div>
    );
}