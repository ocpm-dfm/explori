import {AsyncApiState} from "../hooks";
import {AnyAction} from "redux";

export function QueryReducer<DataType>(initialState: DataType, setStateType: any, resetStateType: any): (state: AsyncApiState<DataType>, action: AnyAction) => AsyncApiState<DataType> {
    return (state, action) => {
        if (action.type === setStateType)
            return action.payload;
        else if (action.type === resetStateType)
            return initialState;
        else if (state === undefined)
            return initialState;
        else
            return state
    }
}

export function SetQueryState<DataType>(setStateType: any): (state: AsyncApiState<DataType>) => (dispatch: Function) => AnyAction {
    return (state) => ((dispatch) => dispatch({
        type: setStateType,
        payload: state
    }))
}

export function ResetQueryState(resetStateType: any): () => (dispatch: Function) => AnyAction {
    return () => ((dispatch) => dispatch({
        type: resetStateType,
    }))
}