import { LOAD_EVENT_LOGS } from "./eventLogs.types"

const eventLogsReducer = (state = [], action: Action) => {
    switch (action.type) {
        case LOAD_EVENT_LOGS: return state
        default: return state
    }
}

export default eventLogsReducer

interface Action {
    type: string,
    payload: {}
}