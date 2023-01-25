import CytoscapeComponent from "react-cytoscapejs";

import './cytodfm.css';
import {
    ForwardedRef,
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from "react";
import cytoscape, {EventObject} from "cytoscape";
import {getObjectTypeColor, secondsToHumanReadableFormat} from "../../utils";
import {EdgeHighlightingMode} from "./EdgeHighlighters";

import {AlignmentsData} from "../../pages/Alignments/Alignments";
import {AlignElement} from "../../redux/AlignmentsQuery/alignmentsquery.types";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCircleXmark} from "@fortawesome/free-regular-svg-icons";
import {
    EdgePerformance,
    ObjectTypePerformanceMetrics,
    PerformanceMetrics,
    ObjectTypePerformanceMetricsEdges
} from "../../redux/PerformanceQuery/performancequery.types";
import React from "react";

const fileSaver = require('file-saver');


export type DirectlyFollowsMultigraph = {
    thresholds: number[]
    nodes: {
        label: string,
        counts: { [key: string]: [number, number][] }
        traces: number[]
    }[],
    subgraphs: {
        [key: string]: {
            source: number,
            target: number,
            counts: [number, number][]
            traces: number[]
        }[]
    },
    traces: [
        {
            actions: number[]
            thresholds: {
                [key: string]: {
                    count: number
                    threshold: number
                }
            }
        }
    ]
}


export type CytoDFMProps = {
    dfm: DirectlyFollowsMultigraph | null,
    performanceMetrics: PerformanceMetrics | null,
    threshold: number,
    selectedObjectTypes: string[],
    positionsFrozen: boolean,
    highlightingMode: EdgeHighlightingMode,
    graphHorizontal: boolean,
    alignmentMode: string,
    legendPosition: string,
    performanceMode: string,
    infoboxEnabled: boolean
}

export interface CytoDFMMethods {
    exportAsJpg(): void;
}


const startIcon = `data:image/svg+xml;utf8,${encodeURIComponent("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n" +
    "<!-- Created with Inkscape (http://www.inkscape.org/) -->\n" +
    "\n" +
    "<svg\n" +
    "   width=\"64\"\n" +
    "   height=\"64\"\n" +
    "   viewBox=\"0 0 16.933333 16.933333\"\n" +
    "   version=\"1.1\"\n" +
    "   id=\"svg5\"\n" +
    "   inkscape:version=\"1.2.1 (9c6d41e410, 2022-07-14, custom)\"\n" +
    "   sodipodi:docname=\"start.svg\"\n" +
    "   xmlns:inkscape=\"http://www.inkscape.org/namespaces/inkscape\"\n" +
    "   xmlns:sodipodi=\"http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd\"\n" +
    "   xmlns=\"http://www.w3.org/2000/svg\"\n" +
    "   xmlns:svg=\"http://www.w3.org/2000/svg\">\n" +
    "  <sodipodi:namedview\n" +
    "     id=\"namedview7\"\n" +
    "     pagecolor=\"#ffffff\"\n" +
    "     bordercolor=\"#666666\"\n" +
    "     borderopacity=\"1.0\"\n" +
    "     inkscape:showpageshadow=\"2\"\n" +
    "     inkscape:pageopacity=\"0.0\"\n" +
    "     inkscape:pagecheckerboard=\"0\"\n" +
    "     inkscape:deskcolor=\"#d1d1d1\"\n" +
    "     inkscape:document-units=\"mm\"\n" +
    "     showgrid=\"true\"\n" +
    "     inkscape:zoom=\"9.6402198\"\n" +
    "     inkscape:cx=\"41.181634\"\n" +
    "     inkscape:cy=\"33.401728\"\n" +
    "     inkscape:window-width=\"1920\"\n" +
    "     inkscape:window-height=\"979\"\n" +
    "     inkscape:window-x=\"0\"\n" +
    "     inkscape:window-y=\"0\"\n" +
    "     inkscape:window-maximized=\"1\"\n" +
    "     inkscape:current-layer=\"layer1\">\n" +
    "    <inkscape:grid\n" +
    "       type=\"xygrid\"\n" +
    "       id=\"grid930\"\n" +
    "       empspacing=\"8\" />\n" +
    "  </sodipodi:namedview>\n" +
    "  <defs\n" +
    "     id=\"defs2\" />\n" +
    "  <g\n" +
    "     inkscape:label=\"Layer 1\"\n" +
    "     inkscape:groupmode=\"layer\"\n" +
    "     id=\"layer1\">\n" +
    "    <circle\n" +
    "       style=\"fill:none;fill-opacity:1;stroke:#1976d2;stroke-width:1.5875;stroke-opacity:1;stroke-dasharray:none\"\n" +
    "       id=\"path989\"\n" +
    "       cx=\"8.4666662\"\n" +
    "       cy=\"8.4666662\"\n" +
    "       r=\"6.3499999\" />\n" +
    "    <path\n" +
    "       style=\"fill:#1976d2;fill-opacity:1;stroke:none;stroke-width:0.363802px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1\"\n" +
    "       d=\"M 6.4492186,5.5562503 10.484115,8.4666668 6.4492186,11.377083 Z\"\n" +
    "       id=\"path4051\"\n" +
    "       sodipodi:nodetypes=\"cccc\" />\n" +
    "  </g>\n" +
    "</svg>\n")}`
const stopIcon = `data:image/svg+xml;utf8,${encodeURIComponent("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n" +
    "<!-- Created with Inkscape (http://www.inkscape.org/) -->\n" +
    "\n" +
    "<svg\n" +
    "   width=\"64\"\n" +
    "   height=\"64\"\n" +
    "   viewBox=\"0 0 16.933333 16.933333\"\n" +
    "   version=\"1.1\"\n" +
    "   id=\"svg5\"\n" +
    "   inkscape:version=\"1.2.1 (9c6d41e410, 2022-07-14, custom)\"\n" +
    "   sodipodi:docname=\"stop.svg\"\n" +
    "   xmlns:inkscape=\"http://www.inkscape.org/namespaces/inkscape\"\n" +
    "   xmlns:sodipodi=\"http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd\"\n" +
    "   xmlns=\"http://www.w3.org/2000/svg\"\n" +
    "   xmlns:svg=\"http://www.w3.org/2000/svg\">\n" +
    "  <sodipodi:namedview\n" +
    "     id=\"namedview7\"\n" +
    "     pagecolor=\"#ffffff\"\n" +
    "     bordercolor=\"#666666\"\n" +
    "     borderopacity=\"1.0\"\n" +
    "     inkscape:showpageshadow=\"2\"\n" +
    "     inkscape:pageopacity=\"0.0\"\n" +
    "     inkscape:pagecheckerboard=\"0\"\n" +
    "     inkscape:deskcolor=\"#d1d1d1\"\n" +
    "     inkscape:document-units=\"mm\"\n" +
    "     showgrid=\"true\"\n" +
    "     inkscape:zoom=\"9.6402198\"\n" +
    "     inkscape:cx=\"41.181634\"\n" +
    "     inkscape:cy=\"33.401728\"\n" +
    "     inkscape:window-width=\"1920\"\n" +
    "     inkscape:window-height=\"979\"\n" +
    "     inkscape:window-x=\"0\"\n" +
    "     inkscape:window-y=\"0\"\n" +
    "     inkscape:window-maximized=\"1\"\n" +
    "     inkscape:current-layer=\"layer1\">\n" +
    "    <inkscape:grid\n" +
    "       type=\"xygrid\"\n" +
    "       id=\"grid930\"\n" +
    "       empspacing=\"8\" />\n" +
    "  </sodipodi:namedview>\n" +
    "  <defs\n" +
    "     id=\"defs2\" />\n" +
    "  <g\n" +
    "     inkscape:label=\"Layer 1\"\n" +
    "     inkscape:groupmode=\"layer\"\n" +
    "     id=\"layer1\">\n" +
    "    <circle\n" +
    "       style=\"fill:none;fill-opacity:1;stroke:#1976d2;stroke-width:1.5875;stroke-opacity:1;stroke-dasharray:none\"\n" +
    "       id=\"path989\"\n" +
    "       cx=\"8.4666662\"\n" +
    "       cy=\"8.4666662\"\n" +
    "       r=\"6.3499999\" />\n" +
    "    <rect\n" +
    "       style=\"fill:#1976d2;fill-opacity:1;stroke:none;stroke-width:1.5875;stroke-dasharray:none;stroke-opacity:1\"\n" +
    "       id=\"rect4415\"\n" +
    "       width=\"4.2333331\"\n" +
    "       height=\"4.2333331\"\n" +
    "       x=\"6.3499999\"\n" +
    "       y=\"6.3499999\" />\n" +
    "  </g>\n" +
    "</svg>\n")}`;

const graphStylesheet: cytoscape.Stylesheet[] = [
    {
        "selector": 'node',  // For all nodes
        'style':
            {
                "opacity": 0.9,
                "label": "data(label)",  // Label of node to display
                "background-color": "rgb(25, 118, 210)",  // node color
                "color": "#FFFFFF",  // node label color
                "text-halign": "center",
                "text-valign": "center",
                'width': 'label',
                "shape": "round-rectangle",
                "padding-left": ".5em"
            }
    },
    {
        selector: ".icon",
        "style": {
            backgroundColor: "rgba(255, 255, 255, 0)",
            "color": "black",
            "background-image": "data(image)",
            "background-fit": "cover",
            "width": "3em",
            "height": "3em",
            "background-height": "3em",
            "background-width": "3em",
            "text-halign": "right",
        }
    },
    {
        "selector": 'edge',  // For all edges
        "style":
            {
                "width": "data(width)",
                "target-arrow-color": "data(color)",  // Arrow color
                "target-arrow-shape": "triangle",  // Arrow shape
                "line-color": "data(color)",  // edge color
                'arrow-scale': 2,  // Arrow size
                // Default curve-If it is style, the arrow will not be displayed, so specify it
                'curve-style': 'bezier',
                'label': 'data(label)',
                "line-style": "solid",
                'text-wrap': 'wrap',
                'color': 'black',
            }
    },
    {
        "selector": '.log-move',  // For all edges
        "style":
            {
                "width": "data(width)",
                "target-arrow-color": "data(color)",  // Arrow color
                "target-arrow-shape": "triangle",  // Arrow shape
                "line-color": "data(color)",  // edge color
                'arrow-scale': 2,  // Arrow size
                // Default curve-If it is style, the arrow will not be displayed, so specify it
                'curve-style': 'bezier',
                'label': 'data(label)',
                "line-style": "dashed",
                'text-wrap': 'wrap',
                'color': 'black',
            }
    },
    {
        "selector": '.model-move',  // For all edges
        "style":
            {
                "width": "data(width)",
                "target-arrow-color": "data(color)",  // Arrow color
                "target-arrow-shape": "triangle",  // Arrow shape
                "line-color": "data(color)",  // edge color
                'arrow-scale': 2,  // Arrow size
                // Default curve-If it is style, the arrow will not be displayed, so specify it
                'curve-style': 'bezier',
                'label': 'data(label)',
                "line-style": "dotted",
                'text-wrap': 'wrap',
                'color': 'black',
            }
    },
    {
        "selector": '.loop',
        "style":
            {
                'loop-direction': '180deg',
                'loop-sweep': '45deg',
                'target-endpoint': 'outside-to-line',
                'source-endpoint': 'outside-to-line'
                // 'loop-direction': '-90deg',
                // 'loop-sweep': '-25deg',
                // 'control-point-step-size': '100'
                // 'target-endpoint': 'outside-to-line',
                // 'source-endpoint': 'outside-to-line',
            }
    }];

interface NodeState {
    x: number | null
    y: number | null
    frozen: boolean
}

interface CytoDFMSoftState {
    nodeStates: NodeState[],
    pan: cytoscape.Position | null,
    zoom: number | null,
    lastZoom: number | null
}

interface CytoDFMSelectionState {
    selectedNode: number | null,
    selectedEdge: [string, number, number] | null
}

type RenderTraceData = {
    id: number,
    activities: String[],
    count: number
}

type SelectedTracesData = {
    shown: { [key: string]: RenderTraceData[] },
    hidden: { [key: string]: RenderTraceData[] }
}

function initializeNodePositions(dfm: DirectlyFollowsMultigraph | null) {
    if (dfm === null)
        return [];
    return [...Array(dfm.nodes.length).keys()].map(() => ({
        x: null,
        y: null,
        frozen: false
    }));
}

export const FilteredCytoDFM = forwardRef((props: CytoDFMProps, ref: ForwardedRef<CytoDFMMethods | undefined>) => {
    // We don't actually want to rerender when the state changes, but we want it to persist accross rerenders.
    // That is why we use useRef instead of useState.
    const softState = useRef<CytoDFMSoftState>({
        nodeStates: initializeNodePositions(props.dfm),
        pan: null,
        zoom: null,
        lastZoom: null
    });
    // Automatically reset node positions when the DFM changes.
    useEffect(() => {
        softState.current = {
            nodeStates: initializeNodePositions(props.dfm),
            pan: null,
            zoom: null,
            lastZoom: null
        }
    }, [props.dfm]);

    const [selection, setSelection] = useState<CytoDFMSelectionState>({
        selectedNode: null,
        selectedEdge: null
    });
    const [logAlignments, setLogAlignments] = useState<[string, AlignElement, AlignElement, AlignElement, string[][]][]>([]);
    const [modelAlignments, setModelAlignments] = useState<[string, AlignElement, AlignElement, string[][]][]>([]);
    const cytoscapeRef = useRef<cytoscape.Core | null>(null);

    useImperativeHandle(ref, () => ({
        exportAsJpg() {
            if (cytoscapeRef.current == null)
                return;

            fileSaver.saveAs(cytoscapeRef.current.jpg(), "graph.jpg");
        }
    }));

    let boxedThreshold = 0;
    if (props.dfm) {
        for (const thresholdCandidate of props.dfm.thresholds) {
            if (thresholdCandidate <= props.threshold)
                boxedThreshold = thresholdCandidate;
            else
                break;
        }
    }

    // The usage of useMemo reduces the number of rerenders, hence performance.
    const [elements, legendObjectTypeColors] = useMemo(() => {
        const dfm = props.dfm;
        const thresh = boxedThreshold;
        const selectedObjectTypes = props.selectedObjectTypes;
        const edgeHighlightingMode = props.highlightingMode;
        const performanceMetrics = props.performanceMetrics? props.performanceMetrics: null;

        console.log("Filtering", dfm, selectedObjectTypes, thresh);


        if (!dfm)
            return [[], []];

        const links: any[] = [];
        const legendObjectTypeColors: [string, string][] = [];

        let allNodesOfSelectedObjectTypes = new Set<number>();
        const numberOfColorsNeeded = Object.keys(dfm.subgraphs).length;

        const highlightingInitialData = edgeHighlightingMode.createInitialData(dfm, props);

        Object.keys(dfm.subgraphs).forEach((objectType, i) => {
            if (selectedObjectTypes.includes(objectType)) {
                const objectTypeColor = getObjectTypeColor(numberOfColorsNeeded, i);
                const performanceMetric = (performanceMetrics && performanceMetrics[objectType] !== null)? performanceMetrics[objectType]: null;
                const performanceMetricEdges = performanceMetric? performanceMetric.edges : null

                const edges = dfm.subgraphs[objectType];
                let hasDisplayedEdge = false;

                console.log(dfm.nodes)

                for (const edge of edges) {
                    let count: number | string = getCountAtThreshold(edge.counts, thresh);
                    const sourceLabel = dfm.nodes[edge.source].label;
                    const targetLabel = dfm.nodes[edge.target].label;
                    if (performanceMetricEdges){
                        count = getPerformanceCount(props.performanceMode, performanceMetricEdges, sourceLabel, targetLabel, count)
                    }

                    // Ignore edges below the threshold.
                    if (count === 0)
                        continue

                    hasDisplayedEdge = true;

                    let classes = "";
                    if (edge.source === edge.target) {
                        classes = "loop";
                    }

                    const width = `${0.2 * edgeHighlightingMode.edgeWidth(edge.source, edge.target, objectType, highlightingInitialData)}em`
                    links.push(
                        {
                            data:
                                {
                                    source: `${edge.source}`,
                                    target: `${edge.target}`,
                                    label: `${count}`,
                                    style: 'solid',
                                    color: objectTypeColor,
                                    width,

                                    objectType,
                                    metaSource: edge.source,
                                    metaTarget: edge.target
                                },
                            classes
                        });

                    allNodesOfSelectedObjectTypes.add(edge.source);
                    allNodesOfSelectedObjectTypes.add(edge.target);
                }

                if (hasDisplayedEdge)
                    legendObjectTypeColors.push([objectType, objectTypeColor]);
            }
        });

        console.log(Array.from(allNodesOfSelectedObjectTypes));

        let filteredNodesLabels: string[] = []
        // Filter the nodes by threshold and object type and prepare them for forcegraph.
        const filteredNodes = Array.from(allNodesOfSelectedObjectTypes)
            .map((i: number) => {
                const node = dfm.nodes[i];
                let count = Object.keys(node.counts)
                    .filter((objectType) => selectedObjectTypes.includes(objectType))
                    .map((objectType) => getCountAtThreshold(node.counts[objectType], thresh))
                    .reduce((a, b) => a + b);

                if (count === 0)
                    return null;

                filteredNodesLabels.push(node.label)
                if (i === 0) {
                    return {
                        data: {
                            id: `${i}`,
                            label: 'Process start',
                            numberId: i,
                            image: startIcon
                        },
                        classes: "icon"
                    }
                }
                if (i === 1) {
                    return {
                        data: {
                            id: `${i}`,
                            numberId: i,
                            image: stopIcon,
                            label: "Process end"
                        },
                        classes: "icon"
                    }
                }

                return (
                    {
                        data: {
                            id: `${i}`,
                            label: `${node.label} (${count})`,
                            numberId: i
                        },
                        classes: "activity",
                        position: {
                            x: 10,
                            y: 10
                        }
                    }
                );
            })
            // Filter out all nodes that are below the threshold. The cast is needed to tell TypeScript that all "null" nodes are removed.
            .filter((x) => x !== null) as cytoscape.ElementDefinition[];

        let alignmentNodes = []
        let alignmentEdges = []
        let objectTypesList = Object.keys(dfm.subgraphs)

        if (props.alignmentMode !== "none") {
            const nodeIndexDict = createNodeIndexDict(dfm.nodes)
            for (const [objectType, lastActivity, intermediateActivity, nextActivity, alignments] of logAlignments) {
                if (selectedObjectTypes.includes(objectType)) {
                    // check that indices are all in filteredNodes
                    if (
                        filteredNodesLabels.indexOf(lastActivity.activity) === -1 ||
                        filteredNodesLabels.indexOf(intermediateActivity.activity) === -1 ||
                        filteredNodesLabels.indexOf(nextActivity.activity) === -1
                    ) {
                        continue
                    }

                    let traceNodeIndices = translateTracesToNodeIndex(alignments, nodeIndexDict)
                    const objectTypeColor = getObjectTypeColor(numberOfColorsNeeded, objectTypesList.indexOf(objectType));

                    let lastNodeIndex: number = nodeIndexDict[lastActivity.activity],
                        intermediateNodeIndex: number = nodeIndexDict[intermediateActivity.activity],
                        nextNodeIndex: number = nodeIndexDict[nextActivity.activity];

                    const nodeIndices = [lastNodeIndex, intermediateNodeIndex, nextNodeIndex]

                    if (nodeIndices.indexOf(-1) > -1) {
                        break
                    }

                    const nodeLength: number = dfm.nodes.length + alignmentNodes.length
                    const sourceNodeIndex: number = nodeLength + 1
                    const targetNodeIndex: number = nodeLength + 2
                    let count: number | string = findMatchingTracesCount(traceNodeIndices, objectType, dfm.traces)
                    if (props.performanceMode !== "Counts"){
                        count = ""
                    }

                    if (props.alignmentMode === "expansive") {
                        // need node between lastNode and intermediateNode
                        alignmentNodes.push({
                            data: {
                                id: `${sourceNodeIndex}`,
                                //label: `${lastActivity.activity + "_" + intermediateActivity.activity} (${count})`,
                                label: ".",
                                numberId: sourceNodeIndex
                            },
                            classes: "activity",
                            position: {
                                x: 10,
                                y: 10
                            }
                        })

                        // need node between intermediateNode and nextNode
                        alignmentNodes.push({
                            data: {
                                id: `${targetNodeIndex}`,
                                label: ".",
                                numberId: targetNodeIndex
                            },
                            classes: "activity",
                            position: {
                                x: 10,
                                y: 10
                            }
                        })
                    }

                    const neededEdgesExpansive: number[][] = [
                        // need edge between these two nodes
                        [sourceNodeIndex, targetNodeIndex, lastNodeIndex, nextNodeIndex],
                        // need edge between lastNode and sourceNode
                        [lastNodeIndex, sourceNodeIndex, lastNodeIndex, intermediateNodeIndex],
                        // need edge between sourceNode and intermediateNode
                        [sourceNodeIndex, intermediateNodeIndex, lastNodeIndex, intermediateNodeIndex],
                        // need edge between intermediateNode and targetNode
                        [intermediateNodeIndex, targetNodeIndex, intermediateNodeIndex, nextNodeIndex],
                        // need edge between targetNode and nextNode
                        [targetNodeIndex, nextNodeIndex, intermediateNodeIndex, nextNodeIndex]
                    ]

                    const neededEdgesSimple: number[][] = [
                        [lastNodeIndex, nextNodeIndex, lastNodeIndex, nextNodeIndex]
                    ]

                    let neededEdges;
                    if (props.alignmentMode === "simple") {
                        neededEdges = neededEdgesSimple
                    } else {
                        neededEdges = neededEdgesExpansive
                    }

                    let matchingFirstEdge = findMatch(dfm.subgraphs[objectType], lastNodeIndex, intermediateNodeIndex)
                    let matchingSecondEdge = findMatch(dfm.subgraphs[objectType], intermediateNodeIndex, nextNodeIndex)

                    for (const [source, target, metaSource, metaTarget] of neededEdges) {
                        let classes = "log-move"
                        if (props.alignmentMode === "expansive") {
                            const performanceMetric = (performanceMetrics && performanceMetrics[objectType] !== null)? performanceMetrics[objectType]: null;
                            const performanceMetricEdges = performanceMetric? performanceMetric.edges : null
                            // first edge
                            if ((source === lastNodeIndex && target === sourceNodeIndex) || (source === sourceNodeIndex && target === intermediateNodeIndex)) {
                                if (matchingFirstEdge !== null) {
                                    count = getCountAtThreshold(matchingFirstEdge.counts, thresh);
                                    if (props.performanceMode !== "Counts"){
                                        const sourceLabel = dfm.nodes[matchingFirstEdge.source].label;
                                        const targetLabel = dfm.nodes[matchingFirstEdge.target].label;
                                        if (performanceMetricEdges){
                                            count = getPerformanceCount(props.performanceMode, performanceMetricEdges, sourceLabel, targetLabel, count)
                                        }
                                    }
                                    classes = "edge"
                                }
                            }
                            // second edge
                            if ((source === intermediateNodeIndex && target === targetNodeIndex) || (source === targetNodeIndex && target === nextNodeIndex)) {
                                if (matchingSecondEdge !== null) {
                                    count = getCountAtThreshold(matchingSecondEdge.counts, thresh);
                                    if (props.performanceMode !== "Counts"){
                                        const performanceMetric = (performanceMetrics && performanceMetrics[objectType] !== null)? performanceMetrics[objectType]: null;
                                        const performanceMetricEdges = performanceMetric? performanceMetric.edges : null
                                        const sourceLabel = dfm.nodes[matchingSecondEdge.source].label;
                                        const targetLabel = dfm.nodes[matchingSecondEdge.target].label;
                                        if (performanceMetricEdges){
                                            count = getPerformanceCount(props.performanceMode, performanceMetricEdges, sourceLabel, targetLabel, count)
                                        }
                                    }
                                    classes = "edge"
                                }
                            }
                        }

                        const width = `${0.2 * edgeHighlightingMode.edgeWidth(source, target, objectType, highlightingInitialData)}em`
                        alignmentEdges.push(
                            {
                                data:
                                    {
                                        source: `${source}`,
                                        target: `${target}`,
                                        label: `${count}`,
                                        color: objectTypeColor,
                                        width,

                                        objectType,
                                        metaSource: metaSource,
                                        metaTarget: metaTarget
                                    },
                                classes
                            });

                        allNodesOfSelectedObjectTypes.add(source);
                        allNodesOfSelectedObjectTypes.add(target);
                    }

                    if (props.alignmentMode === "expansive") {
                        const firstEdge = findRedundantEdge(links, lastNodeIndex, intermediateNodeIndex, objectType)
                        const secondEdge = findRedundantEdge(links, intermediateNodeIndex, nextNodeIndex, objectType)
                        links.splice(links.indexOf(firstEdge), 1)
                        links.splice(links.indexOf(secondEdge), 1)
                    }

                }
            }

            for (const [objectType, lastActivity, nextActivity, alignments] of modelAlignments) {
                if (selectedObjectTypes.includes(objectType)) {
                    if (
                        filteredNodesLabels.indexOf(lastActivity.activity) === -1 ||
                        filteredNodesLabels.indexOf(nextActivity.activity) === -1
                    ) {
                        continue
                    }
                    let traceNodeIndices = translateTracesToNodeIndex(alignments, nodeIndexDict)
                    const objectTypeColor = getObjectTypeColor(numberOfColorsNeeded, objectTypesList.indexOf(objectType));

                    let lastNodeIndex: number = nodeIndexDict[lastActivity.activity],
                        nextNodeIndex: number = nodeIndexDict[nextActivity.activity];

                    const nodeIndices = [lastNodeIndex, nextNodeIndex]

                    if (nodeIndices.indexOf(-1) > -1) {
                        break
                    }

                    const nodeLength: number = dfm.nodes.length + alignmentNodes.length
                    const sourceNodeIndex: number = nodeLength + 1
                    let count: number | string = findMatchingTracesCount(traceNodeIndices, objectType, dfm.traces)
                    if (props.performanceMode !== "Counts"){
                        count = ""
                    }

                    if (props.alignmentMode === "expansive") {
                        // need node between lastNode and nextNode
                        alignmentNodes.push({
                            data: {
                                id: `${sourceNodeIndex}`,
                                //label: `${lastActivity.activity + "_" + intermediateActivity.activity} (${count})`,
                                label: ">>",
                                numberId: sourceNodeIndex
                            },
                            classes: "activity",
                            position: {
                                x: 10,
                                y: 10
                            }
                        })
                    }

                    const neededEdgesExpansive: number[][] = [
                        // need loop on new node
                        //[sourceNodeIndex, sourceNodeIndex],
                        // need edge between lastNode and sourceNode
                        [lastNodeIndex, sourceNodeIndex, lastNodeIndex, nextNodeIndex],
                        // need edge between sourceNode and nextNode
                        [sourceNodeIndex, nextNodeIndex, lastNodeIndex, nextNodeIndex]
                    ]

                    const neededEdgesSimple: number[][] = [
                        [lastNodeIndex, nextNodeIndex, lastNodeIndex, nextNodeIndex]
                    ]

                    let neededEdges;
                    if (props.alignmentMode === "simple") {
                        neededEdges = neededEdgesSimple
                    } else {
                        neededEdges = neededEdgesExpansive
                    }

                    for (const [source, target, metaSource, metaTarget] of neededEdges) {
                        let classes = ""
                        if (source === target) {
                            classes = "loop ";
                        }
                        classes += 'model-move'

                        const width = `${0.2 * edgeHighlightingMode.edgeWidth(source, target, objectType, highlightingInitialData)}em`
                        alignmentEdges.push(
                            {
                                data:
                                    {
                                        source: `${source}`,
                                        target: `${target}`,
                                        label: `${count}`,
                                        style: 'dotted',
                                        color: objectTypeColor,
                                        width,

                                        objectType,
                                        metaSource: metaSource,
                                        metaTarget: metaTarget
                                    },
                                classes
                            });

                        allNodesOfSelectedObjectTypes.add(source);
                        allNodesOfSelectedObjectTypes.add(target);
                    }
                }
            }
        }

        const elements: cytoscape.ElementDefinition[] = filteredNodes.concat(alignmentNodes).concat(links).concat(alignmentEdges);

        console.log(elements)

        return [elements, legendObjectTypeColors];
    }, [props.dfm, boxedThreshold, props.selectedObjectTypes, props.highlightingMode, modelAlignments, logAlignments, props.alignmentMode, props.performanceMetrics, props.performanceMode]);


    const [selectedTraces, selectedPerformanceMetrics]: [SelectedTracesData, { [key: string]: EdgePerformance } | null] = useMemo(() => {
        const dfm = props.dfm;
        const thresh = boxedThreshold;
        let selectedObjectTypes = props.selectedObjectTypes;

        if (dfm === null)
            return [{shown: {}, hidden: {}} as SelectedTracesData, null];

        let selectedTraces = null;
        let selectedEdge = null;

        // temporary fix for clicking on expansive nodes
        if (selection.selectedNode !== null && dfm.nodes[selection.selectedNode] !== undefined)
            selectedTraces = dfm.nodes[selection.selectedNode].traces;
        // temporary fix for clicking on edges
        else if (selection.selectedEdge !== null && dfm.nodes[selection.selectedEdge[1]] !== undefined && dfm.nodes[selection.selectedEdge[2]] !== undefined) {
            const [objectType, source, target] = selection.selectedEdge;
            const allEdges = dfm.subgraphs[objectType];
            for (const edge of allEdges) {
                if (edge.source === source && edge.target === target) {
                    selectedTraces = edge.traces;
                    selectedEdge = edge;
                    break;
                }
            }

            // Only show traces of the correct object type.
            selectedObjectTypes = [objectType];
        }

        if (selectedTraces == null)
            return [{shown: {}, hidden: {}} as SelectedTracesData, null];

        const shown: { [key: string]: RenderTraceData[] } = {};
        const hidden: { [key: string]: RenderTraceData[] } = {};
        selectedTraces.forEach((traceId) => {
            const trace = dfm.traces[traceId];
            const activities = trace.actions
                .filter((nodeId) => nodeId > 1)
                .map((nodeId) => dfm.nodes[nodeId].label);

            Object.keys(trace.thresholds).forEach((objectType) => {
                if (!selectedObjectTypes.includes(objectType))
                    return;

                const target = thresh < trace.thresholds[objectType].threshold ? hidden : shown;
                if (!target[objectType])
                    target[objectType] = [];

                target[objectType].push({
                    id: traceId,
                    activities,
                    count: trace.thresholds[objectType].count
                })
            });
        });
        Object.keys(shown).forEach((objectType) => {
            shown[objectType].sort((a, b) => a.count > b.count ? -1 : 1);
        });
        Object.keys(hidden).forEach((objectType) => {
            hidden[objectType].sort((a, b) => a.count > b.count ? -1 : 1);
        });

        let performanceMetrics: { [key: string]: EdgePerformance } | null = null;
        if (selectedEdge != null && props.performanceMetrics != null) {
            const source = dfm.nodes[selectedEdge.source].label;
            const target = dfm.nodes[selectedEdge.target].label;
            Object.keys(props.performanceMetrics).forEach((objectType) => {
                if (!props.performanceMetrics || !props.performanceMetrics[objectType])
                    return;
                if (!props.selectedObjectTypes.includes(objectType))
                    return;

                const edges = props.performanceMetrics[objectType].edges;
                if (!edges[source] || !edges[source][target])
                    return;

                if (!performanceMetrics)
                    performanceMetrics = {};
                performanceMetrics[objectType] = edges[source][target];
            });
        }


        return [{
            shown,
            hidden
        }, performanceMetrics]
    }, [props.dfm, props.performanceMetrics, boxedThreshold, props.selectedObjectTypes, selection]);


    if (!props.dfm) {
        // Reset the state if necessary.
        return <div style={{height: "100%", minHeight: "80vh"}}/>;
    }

    const layout = {
        name: 'elk',
        spacingFactor: 1,
        transform: (node: any, pos: { x: number, y: number }) => {
            const nodeId = node.data().numberId;
            const storedPosition = softState.current.nodeStates[nodeId];
            if (!storedPosition) {
                softState.current.nodeStates[nodeId] = {
                    x: pos.x,
                    y: pos.y,
                    frozen: false
                };
                return pos;
            }

            // If the node is frozen, return the stored state.
            if ((props.positionsFrozen || storedPosition.frozen) && storedPosition.x != null && storedPosition.y != null)
                return {x: storedPosition.x, y: storedPosition.y}

            // Update stored location.
            storedPosition.x = pos.x;
            storedPosition.y = pos.y;
            return pos;
        },

        elk: {
            'algorithm': 'layered',
            'elk.direction': props.graphHorizontal ? 'RIGHT' : 'DOWN',
            'spacing.portsSurrounding': 20,
            "spacing.nodeNodeBetweenLayers": 100,
            // ...(props.graphHorizontal ? {
            //     "spacing.nodeNode": 2000
            // }: {})
        }
    };

    function onNodeDrag(event: EventObject) {
        const item = event.target;
        if (item.isNode()) {
            const node = item as cytoscape.NodeSingular;
            const newPos = node.position();
            const nodeId = node.data().numberId;
            const oldPosition = softState.current.nodeStates[nodeId];
            if (newPos.x !== oldPosition.x || newPos.y !== oldPosition.y) {
                oldPosition.x = newPos.x;
                oldPosition.y = newPos.y;
            }
        }
    }

    //endregion

    function onNodeTap(event: EventObject) {
        setSelection({
            selectedNode: event.target.data().numberId,
            selectedEdge: null
        });
    }

    function onEdgeTap(event: EventObject) {
        const edgeData: { objectType: string, metaSource: number, metaTarget: number } = event.target.data();
        setSelection({
            selectedNode: null,
            selectedEdge: [edgeData.objectType, edgeData.metaSource, edgeData.metaTarget]
        });
    }

    function onPan() {
        if (cytoscapeRef.current) {
            softState.current.pan = cytoscapeRef.current?.pan();
            // console.log("saved pan");
        }
    }

    function onZoom() {
        if (cytoscapeRef.current) {
            softState.current.pan = cytoscapeRef.current?.pan();
            softState.current.zoom = cytoscapeRef.current?.zoom();
            softState.current.lastZoom = Date.now();
            // console.log("saved zoom")
        }
    }

    function blockProgramaticPan(event: any) {
        if (cytoscapeRef.current && softState.current.pan) {
            const hasZoomed = softState.current.lastZoom !== null && (Date.now() - softState.current.lastZoom) < 100;
            if (!hasZoomed) {
                const pos = cytoscapeRef.current?.pan();
                const expected = softState.current.pan;

                if (pos.x !== expected.x || pos.y !== expected.y) {
                    cytoscapeRef.current?.pan(expected)
                    // console.log("blocked pan")
                }
            }
            else {
                softState.current.pan = cytoscapeRef.current?.pan();
                // console.log("Updated zoom pan");
            }
        }
    }

    function blockProgrammaticZoom(event: any) {
        if (cytoscapeRef.current && softState.current.zoom && cytoscapeRef.current?.zoom() !== softState.current.zoom) {
            const hasZoomed = softState.current.lastZoom !== null && (Date.now() - softState.current.lastZoom) < 500;
            if (!hasZoomed) {
                cytoscapeRef.current?.zoom(softState.current.zoom);
                // console.log("blocked zoom", event);
            }
        }
    }

    function registerEvents(cy: cytoscape.Core) {
        cytoscapeRef.current = cy;

        cy.on("dragfreeon", "node", (event: EventObject) => onNodeDrag(event));

        cy.on('tap', "node", (event: EventObject) => onNodeTap(event));
        cy.on('tap', 'edge', (event: EventObject) => onEdgeTap(event));
        cy.on('dragpan', (event: any) => onPan())
        cy.on('scrollzoom', (event: any) => onZoom())
        cy.on('pan', (event) => blockProgramaticPan(event));
        cy.on('zoom', (event) => blockProgrammaticZoom(event));
    }

    const hasSelectedObject = selection.selectedNode !== null || selection.selectedEdge !== null;

    console.log("Pan position: ", softState.current.pan)

    console.log(props.performanceMetrics)

    console.log(props.dfm.nodes)

    console.log(elements)

    return (
        <div className="CytoDFM-container" id="DFM-container">
            <CytoscapeComponent
                elements={elements}
                stylesheet={graphStylesheet}
                layout={layout}
                style={{width: '100%', height: '100%'}}
                wheelSensitivity={0.2}
                pan={softState.current.pan ? softState.current.pan : { x: 0, y: 0 }}
                zoom={softState.current.zoom ? softState.current.zoom : 1}
                cy={registerEvents}
            />
            {props.alignmentMode !== "none" && (
                <AlignmentsData
                    setLogAlignments={setLogAlignments}
                    setModelAlignments={setModelAlignments}
                ></AlignmentsData>
            )}
            {legendObjectTypeColors.length > 0 && props.legendPosition !== "none" &&
                <ul className={`CytoDFM-Overlay CytoDFM-Legend CytoDFM-${props.legendPosition}`}>
                    {
                        legendObjectTypeColors.map(([type, color]) => (
                            <li key={type}>
                                <div className="CytoDFM-Legend-Circle" style={{backgroundColor: color}}>
                                </div>
                                {type}
                            </li>
                        ))
                    }
                </ul>
            }
            {
                props.infoboxEnabled && hasSelectedObject && selectedTraces !== null &&
                <div className="CytoDFM-Overlay CytoDFM-Infobox">
                    <div className="CytoDFM-Infobox-Header">
                        {
                            selection.selectedNode !== null &&
                            // temporary fix for clicking on expansive nodes
                            props.dfm.nodes[selection.selectedNode] !== undefined &&
                            <h3>
                                Activity: {props.dfm.nodes[selection.selectedNode].label}
                            </h3>
                        }
                        {
                            selection.selectedEdge !== null &&
                            props.dfm.nodes[selection.selectedEdge[1]] !== undefined &&
                            props.dfm.nodes[selection.selectedEdge[2]] !== undefined &&
                            <h3 className="CytoDFM-Infobox-Header">
                                Edge: {props.dfm.nodes[selection.selectedEdge[1]].label} to {props.dfm.nodes[selection.selectedEdge[2]].label}
                            </h3>
                        }
                        <div className="CytoDFM-Infobox-Header-Close"
                             onClick={() => setSelection({selectedNode: null, selectedEdge: null})}>
                            <FontAwesomeIcon icon={faCircleXmark}/>
                        </div>
                    </div>

                    {
                        selectedPerformanceMetrics && (
                            <div className="CytoDFM-Infobox-Waittime">
                                <div className="CytoDFM-Infobox-Waittime-Header">Waiting time</div>
                                <div className="CytoDFM-Infobox-Waittime-Header">Min</div>
                                <div className="CytoDFM-Infobox-Waittime-Header">Mean</div>
                                <div className="CytoDFM-Infobox-Waittime-Header">Max</div>
                                <div className="CytoDFM-Infobox-Waittime-Header">Total</div>

                                {Object.keys(selectedPerformanceMetrics).map((objectType) => {
                                    const metrics: EdgePerformance = selectedPerformanceMetrics[objectType];
                                    const color = legendObjectTypeColors.find(([ot, _]) => (ot === objectType))![1];
                                    return (
                                        <React.Fragment key={`performance-${objectType}`}>
                                            <div className="CytoDFM-Infobox-Waittime-Cell CytoDFM-Infobox-Waittime-Cell-OT">
                                                <div className="CytoDFM-Legend-Circle" style={{backgroundColor: color}}>
                                                </div>
                                                {objectType}
                                            </div>
                                            <div className="CytoDFM-Infobox-Waittime-Cell">
                                                {secondsToHumanReadableFormat(metrics.min, 2)}
                                            </div>
                                            <div className="CytoDFM-Infobox-Waittime-Cell">
                                                {secondsToHumanReadableFormat(metrics.mean, 2)}
                                            </div>
                                            <div className="CytoDFM-Infobox-Waittime-Cell">
                                                {secondsToHumanReadableFormat(metrics.max, 2)}
                                            </div>
                                            <div className="CytoDFM-Infobox-Waittime-Cell">
                                                {secondsToHumanReadableFormat(metrics.sum, 2)}
                                            </div>
                                        </React.Fragment>
                                    )
                                })
                                }
                            </div>
                        )
                    }
                    <div className="CytoDFM-Infobox-Traces-Grid">
                        <InfoboxTraces traces={selectedTraces.shown}
                                       title="Shown traces"
                                       keyPrefix="shown"
                                       legendColors={legendObjectTypeColors}/>
                        <InfoboxTraces traces={selectedTraces.hidden}
                                       title="Filtered traces"
                                       keyPrefix="hidden"
                                       legendColors={legendObjectTypeColors}/>
                    </div>
                </div>
            }
        </div>
    )
        ;
});

export function getCountAtThreshold(counts: [number, number][], threshold: number): number {
    let rangeStart = 0;
    for (const [rangeEnd, count] of counts) {
        if (rangeStart <= threshold && threshold < rangeEnd)
            return count;
        rangeStart = rangeEnd;
    }
    return 0;
}

function findMatch(subgraph: {
    source: number,
    target: number,
    counts: [number, number][]
    traces: number[]
}[], sourceIndex: number, targetIndex: number) {
    for (let edge of subgraph) {
        if (sourceIndex === edge.source && targetIndex === edge.target) {
            return edge
        }
    }
    return null
}

function findRedundantEdge(edges: {
    data: {
        objectType: string,
        metaSource: number,
        metaTarget: number,
    }
}[], sourceIndex: number, targetIndex: number, objectType: string) {
    for (let edge of edges) {
        if (objectType === edge.data.objectType && sourceIndex === edge.data.metaSource && targetIndex === edge.data.metaTarget) {
            return edge
        }
    }
    return null
}

function createNodeIndexDict(nodes: {
    label: string,
    counts: { [key: string]: [number, number][] }
    traces: number[]
}[]) {
    let nodeIndexDict: { [id: string]: number } = {}
    for (let node of nodes) {
        nodeIndexDict[node.label] = nodes.indexOf(node)
    }
    return nodeIndexDict
}

function translateTracesToNodeIndex(traces: string[][], nodeIndexDict: { [id: string]: number }) {
    let outputTraces: number[][] = []
    for (let trace of traces) {
        let outputTrace: number[] = []
        for (let act of trace) {
            outputTrace.push(nodeIndexDict[act])
        }
        outputTraces.push(outputTrace)
    }
    return outputTraces
}

type traceType = {
    actions: number[]
    thresholds: {
        [key: string]: {
            count: number
            threshold: number
        }
    }
}


function findMatchingTracesCount(alignmentTraces: number[][], objectType: string, traces: traceType[]) {
    let matchingTracesCount: number = 0
    for (let alignmentTrace of alignmentTraces) {
        for (let trace of traces) {
            if (trace.actions.toString() === alignmentTrace.toString()) {
                matchingTracesCount += trace.thresholds[objectType].count
            }
        }
    }
    return matchingTracesCount
}

function InfoboxTraces(props: { title: string, traces: { [key: string]: RenderTraceData[] }, keyPrefix: string, legendColors: [string, string][] }) {
    if (Object.keys(props.traces).length === 0)
        return <React.Fragment />

    return <React.Fragment>
        <h4 className="CytoDFM-Infobox-Traces-Header">{props.title}</h4>
        {Object.entries(props.traces).map(([objectType, traces]) => {
            const color = props.legendColors.find(([ot, _]) => (ot === objectType))![1];

            return (
                <React.Fragment key={props.keyPrefix + "-" + objectType}>
                    <div className="CytoDFM-Infobox-Traces-OT CytoDFM-Infobox-Traces-Header">
                        <div className="CytoDFM-Legend-Circle" style={{backgroundColor: color}}>
                        </div>
                        {objectType}
                    </div>
                        {traces.map((trace) => (
                            <React.Fragment key={`${props.keyPrefix}-${objectType}-${trace.id}`}>
                                <div className="CytoDFM-Infobox-Traces-Trace-Count">
                                    {trace.count}x
                                </div>
                                <div>
                                    {trace.activities.reduce((a, b) => a + ", " + b)}
                                </div>
                            </React.Fragment>
                        ))}
                </React.Fragment>)
        })}
    </React.Fragment>
}

function getPerformanceCount(performanceMode: string, performanceMetricEdges: ObjectTypePerformanceMetricsEdges, sourceLabel: string, targetLabel: string, count: number ){
    let newCount: number | string = count
    if (performanceMode !== "Counts") {
        if(performanceMetricEdges
            && sourceLabel !== "|EXPLORI_START|"
            && targetLabel !== "|EXPLORI_END|"
        ){
            const edgeMetrics = performanceMetricEdges[sourceLabel]? performanceMetricEdges[sourceLabel][targetLabel] : undefined
            if (edgeMetrics === undefined){
                newCount = 0
            } else {
                switch(performanceMode){
                    case "Minimum":
                        newCount = secondsToHumanReadableFormat(edgeMetrics.min, 2)
                        break;
                    case "Mean":
                        newCount = secondsToHumanReadableFormat(edgeMetrics.mean, 2)
                        break;
                    case "Maximum":
                        newCount = secondsToHumanReadableFormat(edgeMetrics.max, 2)
                        break;
                    case "Total":
                        newCount = secondsToHumanReadableFormat(edgeMetrics.sum, 2)
                        break;
                }
            }
        } else {
            newCount = secondsToHumanReadableFormat(0, 2)
        }
    }
    return newCount
}