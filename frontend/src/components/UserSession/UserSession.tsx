import React from 'react';
import './UserSession.css';
import {DefaultLayout} from "../DefaultLayout/DefaultLayout";
import {getURI} from "../../api";

export type UserSessionState = {
    ocel: string,
    filteringThreshold: number,
    selectedObjectTypes: string[],
    alreadySelectedAllObjectTypesInitially: boolean,
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

    let content;
    if (storeOrRestore === "store" && userSessionState) {
        content = (
            <input
                type={"button"}
                value={"Store session"}
                onClick={() => {
                    storeSession("default", userSessionState);
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

export async function storeSession(name: string, session: UserSessionState) {
    const uri = getURI("/session/store", {});

    await fetch(uri, {
        method: 'PUT',
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            session: translateToBackend(session),
        })
    })
        .then((response) => response.json())
        .then((result) => {
            if (result.status === "successful") {
                console.log("Storing of session " + name + " successful!");
            }
        })
        .catch(err => console.log("Error in uploading ..."));
}

export async function restoreSession(name: string, stateChangeCallback: any) {
    const uri = getURI("/session/restore", {name: name});

    await fetch(uri)
        .then((response) => response.json())
        .then((result) => {
            stateChangeCallback(translateToFrontend(result));
            console.log("Restoring of session " + name + " successful!");
        })
        .catch(err => console.log("Error in uploading ..."));
}

function translateToBackend(session: UserSessionState): BackendSession{
    return {
        base_ocel: session.ocel,
        threshold: session.filteringThreshold,
        object_types: session.selectedObjectTypes,
    }
}

function translateToFrontend(session: BackendSession): UserSessionState {
    return {
        ocel: session.base_ocel,
        filteringThreshold: session.threshold,
        selectedObjectTypes: session.object_types,
        // Set `alreadySelectedAllObjectTypesInitially` to true as we're in the process of restoring a session
        // which implies an existing object type selection which we don't want to overwrite!
        alreadySelectedAllObjectTypesInitially: true,
    }
}
