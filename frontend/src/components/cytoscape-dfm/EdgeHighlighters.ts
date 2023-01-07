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

function countBasedHighlighting(countTransform?: ((count: number) => number)): EdgeHighlightingMode {
    return clampOutput({
        createInitialData(dfm: DirectlyFollowsMultigraph, props: CytoDFMProps): any {
            let maxCount = 0;
            let edgeCounts: EdgeDict<number> = {};

            Object.keys(dfm.subgraphs).forEach((objectType) => {
                if (!props.selectedObjectTypes.includes(objectType))
                    return;

                dfm.subgraphs[objectType].forEach((edge) => {
                    let count = getCountAtThreshold(edge.counts, props.threshold);
                    if (countTransform)
                        count = countTransform(count)

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
            if (!data.edgeCounts[source] || !data.edgeCounts[source][target] || !data.edgeCounts[source][target][objectType])
                return 1;
            return data.edgeCounts[source][target][objectType] / data.maxCount;
        }
    })
}

function clampOutput(mode: EdgeHighlightingMode, clampMin: number = 0.2, clampMax: number = 1.5): EdgeHighlightingMode {
    return {
        createInitialData: mode.createInitialData,
        edgeWidth(source: number, target: number, objectType: string, initialData: any): number {
            const original = mode.edgeWidth(source, target, objectType, initialData);
            return clampMin + (clampMax - clampMin) * original;
        }
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
export const EDGE_COUNT_HIGHLIGHTING = countBasedHighlighting();
export const LOGARITHMIC_EDGE_COUNT_HIGHLIGHTING = countBasedHighlighting((count) => {
    if (count > 0)
        return Math.log2(count) / Math.log2(1.1)
    return count
})