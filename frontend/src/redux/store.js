import { configureStore } from '@reduxjs/toolkit'
import { rootReducer } from './rootReducer'
import thunkMiddleware from 'redux-thunk'

import { USER_SESSION_INITIAL_STATE } from './UserSession/userSession.initialState';

const currentOcel = localStorage.getItem("explori-currentOcel") || "uploaded/p2p-normal.jsonocel";

/*
TODO:
    1. Create session reducers:
        i. To restore session
        ii. To create new session
        iii. To save session
    2. When app is mounted restore the session, if not available then create a new session

*/

const store = configureStore({
    reducer: rootReducer,
    middleware: [thunkMiddleware],
    preloadedState: {
        session: USER_SESSION_INITIAL_STATE,
        discoveredDFM: {

        }
    }
})

export default store