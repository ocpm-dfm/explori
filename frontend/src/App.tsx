import React, { useEffect, useState } from 'react';
import './App.css';
import { Home } from "./components/Home/Home";
import { EventLogList } from "./components/EventLogList/EventLogList";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from 'react-query';
import { UserSession, UserSessionState, storeSession, restoreSession } from "./components/UserSession/UserSession";
import getUuid from "uuid-by-string";

export type StateChangeCallback = (update: any) => void;
export type SwitchOcelsCallback = (ocel: string) => void;

function App() {
    // TODO: currently the session is not necessarily the same for this default ocel and choosing the same ocel in the
    //  eventloglist (at least on Windows) as choosing it from the list results in a different (Windows style) path
    //  and we currently simply hash the path as id.
    const currentOcel = localStorage.getItem("explori-currentOcel") || "uploaded/p2p-normal.jsonocel";

    const [sessionState, setSessionState] = useState<UserSessionState>({
        ocel: currentOcel,
        filteringThreshold: 100,
        selectedObjectTypes: [],
        alreadySelectedAllObjectTypesInitially: false,
    });

    const [appState, setAppState] = useState({
        startAutosaving: false,
    });

    const queryClient = new QueryClient();

    function restoreAutoSessionOrCreateNew(ocel: string) {
        restoreSession("autosave-" + getUuid(ocel), (session: UserSessionState) => {
            if (session.ocel !== undefined) {
                stateChangeCallback(session);
            } else {
                stateChangeCallback({
                    ocel: ocel,
                    filteringThreshold: 100,
                    selectedObjectTypes: [],
                    alreadySelectedAllObjectTypesInitially: false,
                });
            }
        });
    }

    const switchOcelsCallback = (ocel: string) => {
        restoreAutoSessionOrCreateNew(ocel);
    };

    const stateChangeCallback: StateChangeCallback = (update: any) => {
        let validUpdates: { [key: string]: any } = {};
        for (const key of Object.keys(update)) {
            if (key in sessionState) {
                validUpdates[key] = update[key];
            } else {
                console.log("WARNING: setting state with unknown key/value pair (" + key + ", " + update[key] + ")");
            }
        }

        setSessionState((old) => Object.assign({}, old, validUpdates));

        if ("ocel" in validUpdates) {
            localStorage.setItem("explori-currentOcel", validUpdates["ocel"]);
        }
    };

    // restore session once after mounting app component and allow autosaving session afterwards
    useEffect(() => {
        //TODO: call restoreSessionReducer from here
        // 

        restoreAutoSessionOrCreateNew(sessionState.ocel);
        setAppState((old) => Object.assign({}, old, {
            startAutosaving: true,
        }));
    }, []);

    // store session everytime it changes
    useEffect(() => {
        if (appState.startAutosaving) {
            storeSession("autosave-" + getUuid(sessionState.ocel), sessionState);
        }
    }, [sessionState]);

    return (
        <QueryClientProvider client={queryClient}>
            <Routes>
                <Route path="/" element={<Home userSessionState={sessionState} stateChangeCallback={stateChangeCallback} />}></Route>
                <Route path="/session" element={<EventLogList switchOcelsCallback={switchOcelsCallback} />}></Route>
                <Route path="/user-session/store" element={<UserSession storeOrRestore={"store"} userSessionState={sessionState} />}></Route>
                <Route path="/user-session/restore" element={<UserSession storeOrRestore={"restore"} stateChangeCallback={stateChangeCallback} />}></Route>
            </Routes>
        </QueryClientProvider>
    );
}

export default App;
