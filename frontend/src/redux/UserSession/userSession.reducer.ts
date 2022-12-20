import { AnyAction } from "redux";
import USER_SESSION_INITIAL_STATE from "./userSession.initialState";
import {
    CREATE_USER_SESSION,
    NO_CHANGE_USER_SESSION,
    RESTORE_USER_SESSION,
    SAVE_USER_SESSION, SET_SELECTED_OBJECT_TYPES,
    SET_THRESHOLD,
    UPDATE_USER_SESSION
} from "./userSession.types";

const sessionStateReducer = (session = USER_SESSION_INITIAL_STATE, action: AnyAction) => {
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
        case SET_THRESHOLD:
            return {
                ...session,
                ...{
                    threshold: action.payload
                }
            }
        case SET_SELECTED_OBJECT_TYPES:
            return {
                ...session,
                ...{
                    selectedObjectTypes: action.payload
                },
                ...(action["alreadySelectedAllObjectTypesInitially"] !== undefined ?  {
                    alreadySelectedAllObjectTypesInitially: action.alreadySelectedAllObjectTypesInitially
                } : {})
            }
        case NO_CHANGE_USER_SESSION:
            return session
        default: return session
    }
}

export default sessionStateReducer

export interface Action {
    type: string,
    payload: {}
}