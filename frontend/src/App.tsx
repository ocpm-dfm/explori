import React, {useState} from 'react';
import './App.css';
import { Home } from "./components/Home/Home";
import { EventLogList } from "./components/EventLogList/EventLogList";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from 'react-query';
import {UserSession, UserSessionState} from "./components/UserSession/UserSession";

export type StateChangeCallback = (update: any) => void;

function App() {
    const [state, setState] = useState<UserSessionState>({
        ocel: 'uploaded/p2p-normal.jsonocel',
        filteringThreshold: 100,
        selectedObjectTypes: [],
    });

    const queryClient = new QueryClient();

    const stateChangeCallback: StateChangeCallback = (update: any) => {
        let validUpdates: {[key: string]: any} = {};
        for (const key of Object.keys(update)) {
            if (key in state) {
                validUpdates[key] = update[key];
                console.log("STATE UPDATE: " + key + " : " + update[key]);
            } else {
                console.log("WARNING: setting state with unknown key/value pair (" + key + ", " + update[key] + ")");
            }
        }

        setState((old) => Object.assign({}, old, validUpdates));
    };
                
    return (
        <QueryClientProvider client={queryClient}>
            <Routes>
                <Route path="/" element={<Home userSessionState={state} stateChangeCallback={stateChangeCallback} />}></Route>
                <Route path="/session" element={<EventLogList stateChangeCallback={stateChangeCallback} />}></Route>
                <Route path="/user-session/store" element={<UserSession storeOrRestore={"store"} userSessionState={state} />}></Route>
                <Route path="/user-session/restore" element={<UserSession storeOrRestore={"restore"} stateChangeCallback={stateChangeCallback} />}></Route>
            </Routes>
        </QueryClientProvider>
    );
}

export default App;
