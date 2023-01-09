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
import {AsyncApiState} from "../hooks";
import {AlignementQueryReduce, AlignmentsInitialState} from "./AlignmentsQuery/alingmentsquery";
import {TraceAlignments} from "./AlignmentsQuery/alignmentsquery.types";
import {PerformanceMetrics} from "./PerformanceQuery/performancequery.types";
import {PerformanceMetricsInitialState, PerformanceMetricsQueryReduce} from "./PerformanceQuery/performancequery";

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
    alignmentsQuery: AsyncApiState<TraceAlignments>,
    performanceQuery: AsyncApiState<PerformanceMetrics>
}

const initalState: RootState = {
    session: USER_SESSION_INITIAL_STATE,
    listOfEventLogs: EVENT_LIST_INITIAL_STATE,
    dfmQuery: DfmQueryInitialState,
    alignmentsQuery: AlignmentsInitialState,
    performanceQuery: PerformanceMetricsInitialState
}

const store = configureStore({
    reducer: {
        session: sessionStateReducer,
        listOfEventLogs: eventLogsReducer,
        dfmQuery: DfmQueryReducer as any,
        alignmentsQuery: AlignementQueryReduce as any,
        performanceQuery: PerformanceMetricsQueryReduce as any
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