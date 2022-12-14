import { getURI } from '../../api'
import {
    CREATE_USER_SESSION,
    SAVE_USER_SESSION,
    RESTORE_USER_SESSION
} from './userSession.types'

export const saveUserSession = (payload) => async (dispatch) => {
    return {
        type: SAVE_USER_SESSION
    }
}

export const createUserSession = (payload) => async (dispatch) => {
    return {
        type: CREATE_USER_SESSION
    }
}

export const restoreOrCreateUserSession = (payload) => async (dispatch) => {
    const uri = getURI("/session/restore", { name: payload.sessionName });

    let action = {
        type: ""
    }

    await fetch(uri)
        .then((response) => response.json())
        .then((result) => {

            const sessionExist = result.base_ocel !== undefined ? true : false

            if (sessionExist) {
                action = {
                    type: RESTORE_USER_SESSION,
                    payload: {
                        ocel: session.base_ocel,
                        filteringThreshold: session.threshold,
                        selectedObjectTypes: session.object_types,
                        // Set `alreadySelectedAllObjectTypesInitially` to true as we're in the process of restoring a session
                        // which implies an existing object type selection which we don't want to overwrite!
                        alreadySelectedAllObjectTypesInitially: true
                    }
                }
            }
            else {
                action = {
                    type: CREATE_USER_SESSION,
                    // TODO: what state to update for creating new session
                    payload: {}
                }
            }
        })
        .catch(err => console.log("Error in restoring session ... "));
    return dispatch(action)
}