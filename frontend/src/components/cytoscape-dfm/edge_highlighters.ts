import {CytoDFMProps, DirectlyFollowsMultigraph, getCountAtThreshold} from "./cytodfm";


export interface EdgeHighlightingMode {
    createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any
    edgeWidth(source: number, target: number, objectType: string, initialData: any): number
}

export const NO_HIGHLIGHTING: EdgeHighlightingMode = {
    createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any {
        return null;
    },
    edgeWidth(source: number, target: number, objectType: string, initialData: any): number {
        return 1
    }
}

type EdgeDict<T> =  {[key:number]: {[key:number]: {[key:string]: T}}};

type TraceCountInitialData = {
    maxCount: number,
    edgeCounts: EdgeDict<number>
}

export const TRACE_COUNT_HIGHLIGHTING = clampOutput({
    createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any {
        let maxCount = 0;
        let edgeCounts: EdgeDict<number> = {};

        Object.keys(dfm.subgraphs).forEach((objectType) => {
            if (!props.selectedObjectTypes.includes(objectType))
                return;

            dfm.subgraphs[objectType].forEach((edge) => {
                let count = getCountAtThreshold(edge.counts, props.threshold);
                if (count > 0)
                    count = Math.log2(count) / Math.log2(1.05);

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
    },
    edgeWidth(source: number, target: number, objectType: string, initialData: any): number {
        const data = initialData as TraceCountInitialData;
        return data.edgeCounts[source][target][objectType] / data.maxCount;
    }
}, 0.2, 1.5)

function clampOutput(mode: EdgeHighlightingMode, clampMin: number = 0.2, clampMax: number = 1): EdgeHighlightingMode {
    return {
        createInitialData: mode.createInitialData,
        edgeWidth(source: number, target: number, objectType: string, initialData: any): number {
            const original = mode.edgeWidth(source, target, objectType, initialData);
            return clampMin + (clampMax - clampMin) * original;
        }
    }
}