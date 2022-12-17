import { LOAD_EVENT_LOGS } from "./eventLogs.types";
import { fetchEventLogs } from "./eventLogs.utils";

export const loadEventLogs = (payload: any) => async (dispatch: Function) => {
    const eventLogs = fetchEventLogs()

    const action = {
        type: LOAD_EVENT_LOGS,
        payload: eventLogs
    }

    return dispatch(action)
}