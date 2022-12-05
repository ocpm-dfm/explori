import React from 'react';
import './UserSession.css';
import {DefaultLayout} from "../DefaultLayout/DefaultLayout";
import {getURI} from "../../api";

export type UserSessionState = {
    ocel: string,
    filteringThreshold: number,
    selectedObjectTypes: string[],
}

type BackendSession = {
    base_ocel: string,
    threshold: number,
    object_types: string[],
}

export function UserSession(props: {storeOrRestore: string, userSessionState?: UserSessionState, stateChangeCallback?: any}) {
    const storeOrRestore = props.storeOrRestore;
    const userSessionState = props.userSessionState;
    const stateChangeCallback = props.stateChangeCallback;

    async function storeSession(name: string, session: UserSessionState) {
        const uri = getURI("/session/store", {});

        await fetch(uri, {
            method: 'PUT',
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                session: translateToBackend(session.ocel, session.filteringThreshold, session.selectedObjectTypes),
            })
        })
            .then((response) => response.json())
            .then((result) => {
                if (result.status === "successful") {
                    localStorage.setItem('explori', JSON.stringify({
                        latest_session_name: name,
                    }));
                }
            })
            .catch(err => console.log("Error in uploading ..."))
    }

    async function restoreSession(name: string, stateChangeCallback: any) {
        const uri = getURI("/session/restore", {name: name});
        //const uri = getURI("/session/available", {});
        let session = ""; // TODO: request session from backend at {uri}

        await fetch(uri)
            .then((response) => response.json())
            .then((result) => {
                session = result
            })
            .catch(err => console.log("Error in uploading ..."))

        /*fetch(uri)
            .then((response) => response.json())
            .then((result) => {
                console.log(result)
                if (result.status === "successful") {
                    console.log("nice")
                }
            })
            .catch(err => console.log("Error in uploading ...")) */
        console.log(session)
        stateChangeCallback(translateToFrontend(session));
    }

    function translateToBackend(ocel: string, threshold: number, objectTypes: string[]){
        return {
            base_ocel: ocel,
            threshold: threshold,
            object_types: objectTypes,
        }
    }

    function translateToFrontend(session: any){
        return {
            ocel: session.base_ocel,
            filteringThreshold: session.threshold,
            selectedObjectTypes: session.object_types,
        }
    }

    let content;
    if (storeOrRestore === "store" && userSessionState) {
        content = (
            <input
                type={"button"}
                value={"Store session"}
                onClick={() => {
                    // TODO: for now just use ocel name
                    storeSession('default', userSessionState);
                }
            }></input>
        );
    } else if (storeOrRestore === "restore" && stateChangeCallback) {
        content = (
            <input
                type={"button"}
                value={"Restore session"}
                onClick={() => {
                    restoreSession("default", stateChangeCallback);
                }
                }></input>
        );
    }

    return <DefaultLayout content={content} />
}
