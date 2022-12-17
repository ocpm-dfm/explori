import getUuid from 'uuid-by-string'
import { getURI } from '../../api'
import USER_SESSION_INITIAL_STATE from './userSession.initialState'
import {
    CREATE_USER_SESSION,
    SAVE_USER_SESSION,
    RESTORE_USER_SESSION,
    NO_CHANGE_USER_SESSION,
    UPDATE_USER_SESSION
} from './userSession.types'

export const saveUserSession = (payload: SessionInterface) => async (dispatch: Function) => {
    const sessionName = "autosave-" + getUuid(payload.ocel)
    const uri = getURI("/session/store", {})

    const sessionState = {
        base_ocel: payload.ocel,
        threshold: payload.filteringThreshold,
        object_types: payload.selectedObjectTypes
    }

    await fetch(uri, {
        method: 'PUT',
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify({
            name: sessionName,
            session: sessionState,
        })
    })
        .then((response) => response.json())
        .then((result) => {
            if (result.status === "successful") {
                console.log("Storing of session " + sessionName + " successful!");
            }
        })
        .catch(err => console.log("Error in uploading ..."));

    const action = {
        type: NO_CHANGE_USER_SESSION,
        payload: {}
    }

    return dispatch(action)
}

export const createUserSession = (payload: SessionInterface) => async (dispatch: Function) => {
    const action = {
        type: CREATE_USER_SESSION,
        payload: {
            ...USER_SESSION_INITIAL_STATE,
            ...payload
        }
    }
    return dispatch(action)
}

export const modifyUserSession = (payload: SessionInterface) => (dispatch: Function) => {
    const action = {
        type: UPDATE_USER_SESSION,
        payload: { ...payload }
    }

    if ("ocel" in payload) {
        localStorage.setItem("explori-currentOcel", payload["ocel"]);
    }

    return dispatch(action)
}

export const restoreUserSession = (payload: SessionInterface) => async (dispatch: Function) => {
    const sessionName = "autosave-" + getUuid(payload.ocel)
    const uri = getURI("/session/restore", { name: sessionName });

    let action = {
        type: "",
        payload: {}
    }

    await fetch(uri)
        .then((response) => response.json())
        .then((result) => {

            const sessionExist = result.base_ocel !== undefined ? true : false

            if (sessionExist) {
                action = {
                    type: RESTORE_USER_SESSION,
                    payload: {
                        ocel: result.base_ocel,
                        filteringThreshold: result.threshold,
                        selectedObjectTypes: result.object_types,
                        // Set `alreadySelectedAllObjectTypesInitially` to true as we're in the process of restoring a session
                        // which implies an existing object type selection which we don't want to overwrite!
                        alreadySelectedAllObjectTypesInitially: true
                    }
                }
            }
            else {
                action = {
                    type: CREATE_USER_SESSION,
                    payload: {
                        ...USER_SESSION_INITIAL_STATE,
                        ocel: payload.ocel
                    }
                }
            }
        })
        .catch(err => console.log("Error in restoring session ... "));
    return dispatch(action)
}

interface SessionInterface {
    ocel: string,
    filteringThreshold: number,
    selectedObjectTypes: [string],
    alreadySelectedAllObjectTypesInitially: boolean
}