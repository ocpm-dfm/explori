import {AsyncApiState} from "../../hooks";
import {QueryReducer, ResetQueryState, SetQueryState} from "../QueryState";
import {PerformanceMetrics} from "./performancequery.types";

const SET_PERFORMANCE_QUERY_STATE = "SET_PERFORMANCE_QUERY_STATE";
const RESET_PERFORMANCE_QUERY_STATE = "RESET_PERFORMANCE_QUERY_STATE";

export const PerformanceMetricsInitialState: AsyncApiState<PerformanceMetrics> = {
    result: null,
    preliminary: null,
    failed: false
}

export const PerformanceMetricsQueryReduce = QueryReducer(PerformanceMetricsInitialState, SET_PERFORMANCE_QUERY_STATE, RESET_PERFORMANCE_QUERY_STATE);

export const setPerformanceQueryState = SetQueryState(SET_PERFORMANCE_QUERY_STATE);
export const resetPerformanceQueryState = ResetQueryState(RESET_PERFORMANCE_QUERY_STATE);