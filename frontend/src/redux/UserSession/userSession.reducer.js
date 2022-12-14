import { USER_SESSION_INITIAL_STATE } from "./userSession.initialState";
import { CREATE_USER_SESSION, RESTORE_USER_SESSION, SAVE_USER_SESSION } from "./userSession.types";

const sessionStateReducer = (state = USER_SESSION_INITIAL_STATE, action) => {
    switch (action.type) {
        case CREATE_USER_SESSION: return state
        case SAVE_USER_SESSION: return state
        case RESTORE_USER_SESSION: return state
        default: return state
    }
}

export default sessionStateReducer