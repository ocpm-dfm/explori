import {ADD_EVENT_LOG, EventLogMetadata, SET_EVENT_LOGS} from "./eventLogs.types"
import {AnyAction} from "redux";
import {compare} from "./eventLogs.utils";

const eventLogsReducer = (state: EventLogMetadata[] = [], action: AnyAction) => {
    switch (action.type) {
        case SET_EVENT_LOGS:
            return action.payload
        case ADD_EVENT_LOG:
            const newEventLog = action.payload;
            newEventLog.id = state.length + 1
            let newState = [
                ...state,
                newEventLog
            ]
            newState = newState.sort(compare)

            for (let i = 0; i < newState.length; i++) {
                newState[i].id = i;
            }
            return newState
        default: return state
    }
}

export default eventLogsReducer