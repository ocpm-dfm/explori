import React from 'react';
import './UserSession.css';
import {DefaultLayout} from "../DefaultLayout/DefaultLayout";
import {getURI} from "../../api";
import {useQuery} from "react-query";

export type UserSessionState = {
    filteringThreshold: number,
}

export function UserSession(props: {storeOrRestore: string, userSessionState?: UserSessionState, stateChangeCallback?: any}) {
    const storeOrRestore = props.storeOrRestore;
    const userSessionState = props.userSessionState;
    const stateChangeCallback = props.stateChangeCallback;

    // TODO: hardcode name for first tests
    const sessionName = "myVeryCoolSession";

    function storeSession(name: string, session: UserSessionState) {
        const sessionJson = JSON.stringify(session);
        const uri = getURI("/store", {name: name, session: sessionJson });
        // TODO: send session to backend at {uri}
    }

    function restoreSession(name: string, stateChangeCallback: any) {
        const uri = getURI("/restore", {name: name});
        const session = ""; // TODO: request session from backend at {uri}
        const state = JSON.parse(session);
        stateChangeCallback(state);
    }

    let content;
    if (storeOrRestore === "store" && userSessionState) {
        content = (
            <input
                type={"button"}
                value={"Store session"}
                onClick={() => {
                    storeSession(sessionName, userSessionState);
                }
            }></input>
        );
    } else if (storeOrRestore === "restore" && stateChangeCallback) {
        content = (
            <input
                type={"button"}
                value={"Restore session"}
                onClick={() => {
                    restoreSession(sessionName, stateChangeCallback);
                }
                }></input>
        );
    }

    return <DefaultLayout content={content} />
}
