import React, {useEffect, useRef, useState} from 'react';
import './App.css';
import { Home } from "./components/Home/Home";
import { EventLogList } from "./components/EventLogList/EventLogList";
import { Routes, Route, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from 'react-query';
import {Alignments} from "./components/Alignments/Alignments";

import {RootState} from './redux/store';
import {connect} from "react-redux";
import {modifyUserSession, restoreUserSession, saveUserSession} from "./redux/UserSession/userSession.actions";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {SessionState} from "./redux/UserSession/userSession.types";
import {resetDfmQueryState} from "./redux/DFMQuery/dfmquery";
import {resetAlignmentQueryState} from "./redux/AlignmentsQuery/alingmentsquery";

export type StateChangeCallback = (update: any) => void;
export type SwitchOcelsCallback = (newOcel: string) => Promise<void>;

interface OwnProps {

}

const mapStateToProps = (state: RootState, ownProps: OwnProps) => ({
    session: state.session
});

const mapDispatchToProps = (dispatch: ThunkDispatch<{}, {}, any>, ownProps: OwnProps) => ({
    saveSession: async (session: SessionState) => {
        await dispatch(saveUserSession(session));
        console.log("[App] Saved user session");
    },
    setSession: (session: SessionState) => {
        dispatch(modifyUserSession(session))
    },
    loadSession: async (ocel: string) => {
        await dispatch(restoreUserSession(ocel));
    },
    resetQueryStates: () => {
        dispatch(resetDfmQueryState());
        dispatch(resetAlignmentQueryState())
    }
})

type StateProps = ReturnType<typeof mapStateToProps>
type DispatchProps = ReturnType<typeof mapDispatchToProps>
type Props = OwnProps & StateProps & DispatchProps;

export function App(props: Props) {

    const navigateTo = useNavigate();
    const queryClient = new QueryClient();

    const autosaveEnabled = useRef<boolean>(false);

    // Autosave the session on changes.
    useEffect(() => {
        if (props.session.ocel && autosaveEnabled.current) {
            props.saveSession(props.session);
        }
    }, [props.session]);

    // Try to load session on startup or navigate to the new session page if it does not exist.
    useEffect(() => {
        (async () => {
            const currentOcel = localStorage.getItem("explori-currentOcel");
            if (!currentOcel) {
                navigateTo("/session")
                return;
            }

            try {
                await props.loadSession(currentOcel);
                autosaveEnabled.current = true;
            }
            catch (e) {
                navigateTo("/session");
            }
        })();
    }, []);

    const loadSessionOrStartNewOne = async (newOcel: string) => {
        props.resetQueryStates();
        try {
            autosaveEnabled.current = false;
            await props.loadSession(newOcel);
        }
        catch (e) {
            props.setSession({
                ocel: newOcel,
                threshold: 75,
                selectedObjectTypes: [],
                alreadySelectedAllObjectTypesInitially: false
            });
        }
        localStorage.setItem("explori-currentOcel", newOcel);
        autosaveEnabled.current = true;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <Routes>
                <Route path="/" element={<Home />}></Route>
                <Route path="/alignments" element={<Alignments />}></Route>
                <Route path="/session" element={<EventLogList switchOcelsCallback={loadSessionOrStartNewOne} />}></Route>
                {/*<Route path="/user-session/store" element={<UserSession storeOrRestore={"store"} userSessionState={sessionState} />}></Route>*/}
                {/*<Route path="/user-session/restore" element={<UserSession storeOrRestore={"restore"} stateChangeCallback={stateChangeCallback} />}></Route>*/}
            </Routes>
        </QueryClientProvider>
    );
}

export default connect<StateProps, DispatchProps, OwnProps, RootState>(mapStateToProps, mapDispatchToProps)(App)
// export default App;