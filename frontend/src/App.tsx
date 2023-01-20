import React, {useEffect, useRef} from 'react';
import './App.css';
import { Home } from "./pages/Home/Home";
import {Routes, Route, useNavigate, Link} from "react-router-dom";
import { QueryClient, QueryClientProvider } from 'react-query';
import {Alignments} from "./pages/Alignments/Alignments";

import {RootState} from './redux/store';
import {connect} from "react-redux";
import {modifyUserSession, restoreUserSession, saveUserSession, restoreSavedUserSession} from "./redux/UserSession/userSession.actions";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {SessionState} from "./redux/UserSession/userSession.types";
import {resetDfmQueryState} from "./redux/DFMQuery/dfmquery";
import {resetAlignmentQueryState} from "./redux/AlignmentsQuery/alingmentsquery";
import {NewSessionPage} from "./pages/NewSession/NewSessionPage";
import {PerformanceMetricsPage} from "./pages/Performance/Performance";
import {resetPerformanceQueryState} from "./redux/PerformanceQuery/performancequery";
import {Help} from "./pages/Help/Help";
import {UserSession} from "./components/UserSession/UserSession";

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
        dispatch(modifyUserSession(session));
    },
    loadSession: async (ocel: string) => {
        await dispatch(restoreUserSession(ocel));
    },
    restoreSavedUserSession: (session: SessionState) => {
        dispatch(restoreSavedUserSession(session));
    },
    resetQueryStates: () => {
        dispatch(resetDfmQueryState());
        dispatch(resetAlignmentQueryState());
        dispatch(resetPerformanceQueryState());
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
            console.log(currentOcel)
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
                alreadySelectedAllObjectTypesInitially: false,
                highlightingMode: "none",
                graphHorizontal: false,
                alignmentMode: "none",
                legendPosition: "top-left",
                performanceMode: "Counts",
            });
        }
        localStorage.setItem("explori-currentOcel", newOcel);
        autosaveEnabled.current = true;
    }

    function restoreSession(sessionState: SessionState){
        props.resetQueryStates();
        props.restoreSavedUserSession(sessionState);
        localStorage.setItem("explori-currentOcel", sessionState.ocel);
    }

    return (
        <QueryClientProvider client={queryClient}>
            <Routes>
                <Route path="/" element={<Home />}></Route>
                <Route path="/alignments" element={<Alignments />}></Route>
                <Route path="/performance" element={<PerformanceMetricsPage />} />
                <Route path="/session" element={<NewSessionPage switchOcelCallback={loadSessionOrStartNewOne} />} />
                <Route path="/help" element={<Help resetQueryState={props.resetQueryStates}/>} />
                <Route path="/user-session/store" element={<UserSession storeOrRestore={"store"} userSessionState={props.session}/>}></Route>
                <Route path="/user-session/restore" element={<UserSession storeOrRestore={"restore"} stateChangeCallback={restoreSession}/>}></Route>
                <Route path='/docs' element={<a href="localhost:8080/docs"></a>}/>
            </Routes>
        </QueryClientProvider>
    );
}

export default connect<StateProps, DispatchProps, OwnProps, RootState>(mapStateToProps, mapDispatchToProps)(App)
// export default App;