import {AsyncApiState} from "../../api";
import {TraceAlignments} from "../../components/Alignments/Alignments";
import {QueryReducer, ResetQueryState, SetQueryState} from "../QueryState";

const SET_ALIGNMENT_QUERY_STATE = "SET_ALIGNMENT_QUERY_STATE";
const RESET_ALIGNMENT_QUERY_STATE = "RESET_ALIGNMENT_QUERY_STATE";

export const AlignmentsInitialState: AsyncApiState<TraceAlignments> = {
    result: null,
    preliminary: null,
    failed: false
}

export const AlignementQueryReduce = QueryReducer(AlignmentsInitialState, SET_ALIGNMENT_QUERY_STATE, RESET_ALIGNMENT_QUERY_STATE);

export const setAlignmentQueryState = SetQueryState(SET_ALIGNMENT_QUERY_STATE);
export const resetAlignmentQueryState = ResetQueryState(RESET_ALIGNMENT_QUERY_STATE);