export const RESTORE_USER_SESSION = 'RESTORE_USER_SESSION'
export const CREATE_USER_SESSION = 'CREATE_USER_SESSION'
export const SAVE_USER_SESSION = 'SAVE_USER_SESSION'
export const UPDATE_USER_SESSION = 'UPDATE_USER_SESSION'
export const NO_CHANGE_USER_SESSION = 'NO_CHANGE_USER_SESSION'
export const SET_THRESHOLD = 'SET_SESSION_THRESHOLD'


export interface SessionState {
    ocel: string,
    threshold: number,
    selectedObjectTypes: string[],
    alreadySelectedAllObjectTypesInitially: boolean
}
