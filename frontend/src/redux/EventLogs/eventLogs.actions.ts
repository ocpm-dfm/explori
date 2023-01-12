import {ADD_EVENT_LOG, EventLogMetadata, SET_EVENT_LOGS} from "./eventLogs.types";
import { fetchEventLogs } from "./eventLogs.utils";

export const loadEventLogs = () => async (dispatch: Function) => {
    const eventLogs = await fetchEventLogs();

    const action = {
        type: SET_EVENT_LOGS,
        payload: eventLogs
    }

    console.log("Dispatching", action)

    return dispatch(action)
}

export const addEventLog = (eventLog: EventLogMetadata) => (dispatch: Function) => {
    return dispatch({
        type: ADD_EVENT_LOG,
        payload: eventLog
    });
}