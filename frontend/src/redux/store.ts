import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './rootReducer'
import thunkMiddleware from 'redux-thunk'
import logger from 'redux-logger'
import { testUserSession } from "./store.test"

import USER_SESSION_INITIAL_STATE from './UserSession/userSession.initialState';
import EVENT_LIST_INITIAL_STATE from './EventLogs/eventLogs.initialState';

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

const store = configureStore({
    reducer: rootReducer,
    middleware: middleware,
    preloadedState: {
        session: USER_SESSION_INITIAL_STATE,
        listOfEventLogs: EVENT_LIST_INITIAL_STATE,
        startAutosaving: undefined,
        discoveredDFM: undefined
    }
})

if ("REACT_APP_STAGE" in process.env) {
    if (process.env.REACT_APP_STAGE === "test_redux") {
        console.log("[REDUX] Initial State: ", store.getState())
        console.log("[REDUX] Testing User Session")

        testUserSession(store)
    }
}

export default store