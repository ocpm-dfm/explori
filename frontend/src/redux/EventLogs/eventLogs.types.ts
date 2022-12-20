export const SET_EVENT_LOGS = 'LOAD_EVENT_LOGS'
export const ADD_EVENT_LOG = 'ADD_EVENT_LOG'

export interface EventLogMetadata {
    full_path: string
    name: string
    size: string
    dir_type: string
    extra: any
    type: string
}