import {configureStore} from '@reduxjs/toolkit'
import thunkMiddleware from 'redux-thunk'
import logger from 'redux-logger'
import { testUserSession } from "./store.test"

import USER_SESSION_INITIAL_STATE from './UserSession/userSession.initialState';
import EVENT_LIST_INITIAL_STATE from './EventLogs/eventLogs.initialState';
import {TypedUseSelectorHook, useDispatch, useSelector} from "react-redux";
import {SessionState} from "./UserSession/userSession.types";
import {EventLogMetadata} from "./EventLogs/eventLogs.types";
import {DirectlyFollowsMultigraph} from "../components/cytoscape-dfm/cytodfm";
import sessionStateReducer from "./UserSession/userSession.reducer";
import eventLogsReducer from "./EventLogs/eventLogs.reducer";
import {DfmQueryInitialState, DfmQueryReducer} from "./DFMQuery/dfmquery";
import {AsyncApiState} from "../api";
import {AlignementQueryReduce, AlignmentsInitialState} from "./AlignmentsQuery/alingmentsquery";
import {TraceAlignments} from "../components/Alignments/Alignments";

/*
TODO:
    1. Create session reducers:
        i. To restore session
        ii. To create new session
        iii. To save session
    2. When app is mounted restore the session, if not available then create a new session
    3. Store discovered DFM when App component (ie whole application) is unmounted
    4. In listofEventLogs state, the key extra is just a string whereas ReactDataGrid expects it to be FontAwesomeIcon => Map it in react component
*/

let middleware: any[] = [thunkMiddleware]

if ("REACT_APP_STAGE" in process.env) {
    if (process.env.REACT_APP_STAGE === "test_redux") {
        middleware = [thunkMiddleware, logger]
    }
}

export interface RootState {
    session: SessionState,
    listOfEventLogs: EventLogMetadata[],
    dfmQuery: AsyncApiState<DirectlyFollowsMultigraph>,
    alignmentsQuery: AsyncApiState<TraceAlignments>
}

const initalState: RootState = {
    session: USER_SESSION_INITIAL_STATE,
    listOfEventLogs: EVENT_LIST_INITIAL_STATE,
    dfmQuery: DfmQueryInitialState,
    alignmentsQuery: AlignmentsInitialState
}

const store = configureStore({
    reducer: {
        session: sessionStateReducer,
        listOfEventLogs: eventLogsReducer,
        dfmQuery: DfmQueryReducer as any,
        alignmentsQuery: AlignementQueryReduce as any
    },
    middleware: middleware,
    preloadedState: initalState
});

// Infer the `RootState` and `AppDispatch` types from the store itself
// export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch


// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

if ("REACT_APP_STAGE" in process.env) {
    if (process.env.REACT_APP_STAGE === "test_redux") {
        console.log("[REDUX] Initial State: ", store.getState())
        console.log("[REDUX] Testing User Session")

        testUserSession(store)
    }
}

export default store