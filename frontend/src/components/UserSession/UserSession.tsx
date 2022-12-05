import React from 'react';
import './UserSession.css';
import {DefaultLayout} from "../DefaultLayout/DefaultLayout";
import {getURI} from "../../api";
import {useQuery} from "react-query";

export type UserSessionState = {
    ocel: string,
    filteringThreshold: number,
    selectedObjectTypes: string[],
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
                session: {
                    base_ocel: session.ocel,
                    threshold: session.filteringThreshold,
                    object_types: session.selectedObjectTypes,
                },
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

    function restoreSession(name: string, stateChangeCallback: any) {
        //const uri = getURI("/session/restore", {name: name});
        const uri = getURI("/session/available", {});
        const session = ""; // TODO: request session from backend at {uri}

        fetch(uri)
            .then((response) => response.json())
            .then((result) => {
                console.log(result)
                if (result.status === "successful") {
                    console.log("nice")
                }
            })
            .catch(err => console.log("Error in uploading ..."))

        //const state = JSON.parse(session);
        //stateChangeCallback(state);
    }

    let content;
    if (storeOrRestore === "store" && userSessionState) {
        content = (
            <input
                type={"button"}
                value={"Store session"}
                onClick={() => {
                    // TODO: for now just use ocel name
                    storeSession(props.userSessionState!.ocel, userSessionState);
                }
            }></input>
        );
    } else if (storeOrRestore === "restore" && stateChangeCallback) {
        content = (
            <input
                type={"button"}
                value={"Restore session"}
                onClick={() => {
                    restoreSession("sessionName", stateChangeCallback);
                }
                }></input>
        );
    }

    return <DefaultLayout content={content} />
}
