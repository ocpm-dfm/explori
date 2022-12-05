import React, {useState} from 'react';
import './App.css';
import { Home } from "./components/Home/Home";
import { Session } from "./components/Session/Session";
import { EventLogList } from "./components/EventLogList/EventLogList";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from 'react-query';
import {UserSession, UserSessionState} from "./components/UserSession/UserSession";

function App() {
    const [state, setState] = useState<UserSessionState>({
        filteringThreshold: 100,
    });

    const queryClient = new QueryClient();

    const stateChangeCallback = (update: any) => {
        setState((old) => Object.assign({}, old, update));
    };
                
    return (
        <QueryClientProvider client={queryClient}>
            <Routes>
                <Route path="/" element={<Home ocel={"uploaded/p2p-normal.jsonocel"} filteringThreshold={state.filteringThreshold} stateChangeCallback={stateChangeCallback}/>}></Route>
                <Route path="/session" element={<Session/>}></Route>
                <Route path="/user-session/store" element={<UserSession storeOrRestore={"store"} userSessionState={state} />}></Route>
                <Route path="/user-session/restore" element={<UserSession storeOrRestore={"restore"} stateChangeCallback={stateChangeCallback} />}></Route>
            </Routes>
        </QueryClientProvider>
    );
}

export default App;
