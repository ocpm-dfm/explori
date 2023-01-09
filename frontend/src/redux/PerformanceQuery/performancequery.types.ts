export type EdgePerformance = {
    mean: number,
    median: number,
    max: number,
    min: number,
    sum: number,
    stdev: number
}

export type ObjectTypePerformanceMetrics = {
    edges: {[key: string]: {[key:string]: EdgePerformance}}
}


export type PerformanceMetrics = {[key:string]: ObjectTypePerformanceMetrics}