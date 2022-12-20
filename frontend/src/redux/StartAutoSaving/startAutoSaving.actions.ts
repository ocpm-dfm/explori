import { CHANGE_START_AUTOSAVING } from "./startAutoSaving.types"

export const changeStartAutoSaving = (payload: any) => async (dispatch: Function) => {

    const action = {
        type: CHANGE_START_AUTOSAVING,
        payload: payload
    }

    return dispatch(action)
}