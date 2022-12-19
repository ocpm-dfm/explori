import {EventLogMetadata, SET_EVENT_LOGS} from "./eventLogs.types"
import {AnyAction} from "redux";

const eventLogsReducer = (state: EventLogMetadata[] = [], action: AnyAction) => {
    console.log("Reducing", state, action);
    switch (action.type) {
        case SET_EVENT_LOGS: return action.payload
        default: return state
    }
}

export default eventLogsReducer