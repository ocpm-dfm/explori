import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './rootReducer'
import thunkMiddleware from 'redux-thunk'

import USER_SESSION_INITIAL_STATE from './UserSession/userSession.initialState';
import eventLogsList from './EventLogs/eventLogs.initialState';

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

const store = configureStore({
    reducer: rootReducer,
    middleware: [thunkMiddleware],
    preloadedState: {
        session: USER_SESSION_INITIAL_STATE,
        listOfEventLogs: eventLogsList,
        startAutosaving: true,
        discoveredDFM: {

        }
    }
})

export default store