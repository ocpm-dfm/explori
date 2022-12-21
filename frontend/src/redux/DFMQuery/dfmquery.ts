import {AsyncApiState} from "../../hooks";
import {DirectlyFollowsMultigraph} from "../../components/cytoscape-dfm/cytodfm";
import {QueryReducer, ResetQueryState, SetQueryState} from "../QueryState";

export const SET_DFM_QUERY_STATE = "SET_DFM_QUERY_STATE";
export const RESET_DFM_QUERY_STATE = "RESET_DFM_QUERY_STATE";

export type DfmQueryState = AsyncApiState<DirectlyFollowsMultigraph>;

export const DfmQueryInitialState = {
    result: null,
    preliminary: null,
    failed: false
} as DfmQueryState;

export const DfmQueryReducer = QueryReducer(DfmQueryInitialState, SET_DFM_QUERY_STATE, RESET_DFM_QUERY_STATE);

export const setDfmQueryState = SetQueryState(SET_DFM_QUERY_STATE);
export const resetDfmQueryState = ResetQueryState(RESET_DFM_QUERY_STATE);