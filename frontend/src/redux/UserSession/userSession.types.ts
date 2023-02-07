export const RESTORE_USER_SESSION = 'RESTORE_USER_SESSION'
export const CREATE_USER_SESSION = 'CREATE_USER_SESSION'
export const SAVE_USER_SESSION = 'SAVE_USER_SESSION'
export const UPDATE_USER_SESSION = 'UPDATE_USER_SESSION'
export const NO_CHANGE_USER_SESSION = 'NO_CHANGE_USER_SESSION'
export const SET_THRESHOLD = 'SET_SESSION_THRESHOLD'
export const SET_SELECTED_OBJECT_TYPES = 'SET_SELECTED_OBJECT_TYPES'
export const SET_HIGHLIGHTING_MODE = 'SET_HIGHLIGHTING_MODE'
export const SET_GRAPH_HORIZONTAL = 'SET_GRAPH_HORIZONTAL'
export const SET_ALIGNMENT_MODE = 'SET_ALIGNMENT_MODE'
export const SET_LEGEND_POSITION = 'SET_LEGEND_POSITION'
export const SET_EDGE_LABEL_MODE = 'SET_EDGE_LABEL_MODE'

export type EdgeLabelMode = {
    metric: "count" | "pooling_time" | "waiting_time"
    aggregate: "mean" | "median" | "max" | "min" | "sum" | "stdev"
};

export interface SessionState {
    ocel: string,
    threshold: number,
    selectedObjectTypes: string[],
    alreadySelectedAllObjectTypesInitially: boolean,
    highlightingMode: string | null,
    graphHorizontal: boolean,
    alignmentMode: string,
    legendPosition: string,
    edgeLabelMode: EdgeLabelMode,
}
