import { SAVE_DFM } from "./discoveredDFM.types"

export const saveDFM = (payload: any) => async (dispatch: Function) => {
    const action = {
        type: SAVE_DFM,
        payload: payload
    }

    return dispatch(action)
}