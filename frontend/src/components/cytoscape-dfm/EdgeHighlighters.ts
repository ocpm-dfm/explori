import {CytoDFMProps, DirectlyFollowsMultigraph, getCountAtThreshold} from "./cytodfm";


export interface EdgeHighlightingMode {
    createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any
    edgeWidth(source: number, target: number, objectType: string, initialData: any): number
}


type EdgeDict<T> =  {[key:number]: {[key:number]: {[key:string]: T}}};

type TraceCountInitialData = {
    maxCount: number,
    edgeCounts: EdgeDict<number>
}

export class CountBasedHighlighting implements EdgeHighlightingMode {
    transform?: ((count: number) => number)

    constructor(transform?: ((count: number) => number)) {
        this.transform = transform;
    }

    createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any {
        let maxCount = 0;
        let edgeCounts: EdgeDict<number> = {};

        Object.keys(dfm.subgraphs).forEach((objectType) => {
            if (!props.selectedObjectTypes.includes(objectType))
                return;

            dfm.subgraphs[objectType].forEach((edge) => {
                let count = getCountAtThreshold(edge.counts, props.threshold);
                if (this.transform)
                    count = this.transform(count)

                if (!edgeCounts[edge.source])
                    edgeCounts[edge.source] = {};
                if (!edgeCounts[edge.source][edge.target])
                    edgeCounts[edge.source][edge.target] = {};
                edgeCounts[edge.source][edge.target][objectType] = count;

                if (count > maxCount)
                    maxCount = count;
            })
        })

        // We keep the redundant variable to enforce TypeScript type checks.
        const result: TraceCountInitialData = {
            maxCount,
            edgeCounts
        }
        return result;
    }

    edgeWidth(source: number, target: number, objectType: string, initialData: any): number {
        const data = initialData as TraceCountInitialData;
        if (!data.edgeCounts[source] || !data.edgeCounts[source][target] || !data.edgeCounts[source][target][objectType])
            return 1;
        return 1.5 * data.edgeCounts[source][target][objectType] / data.maxCount;
    }
}

export class PerformanceBasedHighlighting implements EdgeHighlightingMode {
    metric: "pooling_time" | "waiting_time"
    aggregate: "min" | "mean" | "median" | "max" | "sum" | "stdev"
    transform?: ((count: number) => number)

    constructor(metric: "pooling_time" | "waiting_time",
                aggregate: "min" | "mean" | "median" | "max" | "sum" | "stdev",
                transform?: ((count: number) => number)) {
        this.metric = metric;
        this.aggregate = aggregate;
        this.transform = transform;
    }

    createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any {
        if (!props.performanceMetrics)
            return null;

        const activityToNodeMap: {[key:string]: number} = {};
        dfm.nodes.forEach((node, index) => {
            activityToNodeMap[node.label] = index;
        })

        let maxValue = 1; // Not zero because we divide by the max value, so having it 1 in the worst case scenario does not hurt.
        let edgeValues: EdgeDict<number> = {};

        Object.keys(props.performanceMetrics.edges).forEach((source) => {
            // Typescript wants this madness.
            if (!props.performanceMetrics || !props.performanceMetrics.edges[source])
                return;
            const sourceIndex = activityToNodeMap[source];
            if (!edgeValues[sourceIndex])
                edgeValues[sourceIndex] = {};

            Object.keys(props.performanceMetrics.edges[source]).forEach((target) => {
                // Typescript wants this madness.
                if (!props.performanceMetrics || !props.performanceMetrics.edges[source] || !props.performanceMetrics.edges[source][target])
                    return;

                const targetIndex = activityToNodeMap[target];
                if (!edgeValues[sourceIndex][targetIndex])
                    edgeValues[sourceIndex][targetIndex] = {};

                const edgeMetrics = props.performanceMetrics.edges[source][target];
                Object.keys(edgeMetrics).forEach((objectType) => {
                    let value = (edgeMetrics[objectType] as any)[this.metric][this.aggregate] as number;

                    if (this.transform)
                        value = this.transform(value)

                    if (value > maxValue)
                        maxValue = value;
                    edgeValues[sourceIndex][targetIndex][objectType] = value;
                })
            })
        });

        return {
            maxCount: maxValue,
            edgeCounts: edgeValues
        }
    }
    edgeWidth(source: number, target: number, objectType: string, initialData: any): number {
        if (!initialData)
            return 1;

        const data = initialData as TraceCountInitialData;
        if (!data.edgeCounts[source] || !data.edgeCounts[source][target] || data.edgeCounts[source][target][objectType] === undefined)
            return 1;


        return 1.5 * data.edgeCounts[source][target][objectType] / data.maxCount;
    }
}

export class OutputClamper implements EdgeHighlightingMode {
    internal: EdgeHighlightingMode
    clampMin: number
    clampMax: number

    constructor(mode: EdgeHighlightingMode, clampMin: number = 0.2, clampMax: number = 1.5) {
        this.internal = mode;
        this.clampMin = clampMin;
        this.clampMax = clampMax;
    }

    createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any {
        return this.internal.createInitialData(dfm, props);
    }

    edgeWidth(source: number, target: number, objectType: string, initialData: any): number {
        const original = this.internal.edgeWidth(source, target, objectType, initialData);
        if (original < this.clampMin)
            return this.clampMin;
        if (original > this.clampMax)
            return this.clampMax;
        return original;
    }
}
export const NO_HIGHLIGHTING: EdgeHighlightingMode = {
    createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any {
        return null;
    },
    edgeWidth(source: number, target: number, objectType: string, initialData: any): number {
        return 1
    }
}