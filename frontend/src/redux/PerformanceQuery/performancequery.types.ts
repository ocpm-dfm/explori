export type AggregatedMetric = {
    mean: number,
    median: number,
    max: number,
    min: number,
    sum: number,
    stdev: number
}

export type NodePerformanceMetrics = {
    service_time: AggregatedMetric
    waiting_time: AggregatedMetric | null
    sojourn_time: AggregatedMetric | null
    synchronization_time: AggregatedMetric | null
    lagging_times: { [key: string]: AggregatedMetric }
    pooling_times: { [key: string]: AggregatedMetric }
    flow_time: AggregatedMetric | null
}

export type EdgePerformanceMetrics = {
    pooling_time: AggregatedMetric
    waiting_time: AggregatedMetric
}


export type PerformanceMetrics = {
    nodes: { [key: string]: NodePerformanceMetrics },
    // source -> target -> objectType -> metrics
    edges: { [key: string]: { [key: string]: { [key: string]: EdgePerformanceMetrics } } }
}
