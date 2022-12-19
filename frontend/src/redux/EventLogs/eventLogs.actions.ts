import { SET_EVENT_LOGS } from "./eventLogs.types";
import { fetchEventLogs } from "./eventLogs.utils";
import {getURI} from "../../api";

export const loadEventLogs = () => async (dispatch: Function) => {
    const eventLogs = await fetchEventLogs();

    const action = {
        type: SET_EVENT_LOGS,
        payload: eventLogs
    }

    console.log("Dispatching", action)

    return dispatch(action)
}