import USER_SESSION_INITIAL_STATE from "./userSession.initialState";
import { CREATE_USER_SESSION, NO_CHANGE_USER_SESSION, RESTORE_USER_SESSION, SAVE_USER_SESSION, UPDATE_USER_SESSION } from "./userSession.types";

const sessionStateReducer = (session = USER_SESSION_INITIAL_STATE, action: Action) => {
    switch (action.type) {
        case CREATE_USER_SESSION:
            return {
                ...session,
                ...action.payload
            }
        case SAVE_USER_SESSION:
            return {
                ...session,
                ...action.payload
            }
        case RESTORE_USER_SESSION:
            return {
                ...session,
                ...action.payload
            }
        case UPDATE_USER_SESSION:
            return {
                ...session,
                ...action.payload
            }
        case NO_CHANGE_USER_SESSION:
            return session
        default: return session
    }
}

export default sessionStateReducer

interface Action {
    type: string,
    payload: {}
}