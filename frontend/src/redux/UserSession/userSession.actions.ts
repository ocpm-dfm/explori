import getUuid from 'uuid-by-string'
import { getURI } from '../../api'
import USER_SESSION_INITIAL_STATE from './userSession.initialState'
import {
    CREATE_USER_SESSION,
    SAVE_USER_SESSION,
    RESTORE_USER_SESSION,
    NO_CHANGE_USER_SESSION,
    UPDATE_USER_SESSION, SessionState, SET_THRESHOLD
} from './userSession.types'
import {ThunkDispatch} from "@reduxjs/toolkit";
import {RootState} from "../store";
import {Action} from "./userSession.reducer";

export const saveUserSession = (session: SessionState) => async (dispatch: ThunkDispatch<RootState, void, Action>) => {
    console.log("SAVING USER SESSION: ", session)
    const sessionName = "autosave-" + getUuid(session.ocel)
    const uri = getURI("/session/store", {})

    const sessionState = {
        base_ocel: session.ocel,
        threshold: session.threshold,
        object_types: session.selectedObjectTypes
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

export const createUserSession = (fullOcelPath: string) => async (dispatch: Function) => {
    const action = {
        type: CREATE_USER_SESSION,
        payload: {
            ...USER_SESSION_INITIAL_STATE,
            currentSelected: fullOcelPath
        }
    }
    return dispatch(action)
}

export const modifyUserSession = (session: SessionState) => (dispatch: Function) => {
    const action = {
        type: UPDATE_USER_SESSION,
        payload: { ...session }
    }

    if ("ocel" in session) {
        localStorage.setItem("explori-currentOcel", session["ocel"]);
    }

    return dispatch(action)
}

export const restoreUserSession = (fullOcelPath: string) =>
    async (dispatch: Function) => {
        const sessionName = "autosave-" + getUuid(fullOcelPath)
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
                            currentSelected: result.base_ocel,
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
                            currentSelected: fullOcelPath
                        }
                    }
                }
            })
            .catch(err => console.log("Error in restoring session ... "));
        return dispatch(action)
    }


export const setThreshold = (newThreshold: number) => (dispatch: Function) => {
    dispatch({
        type: SET_THRESHOLD,
        payload: newThreshold
    })
}