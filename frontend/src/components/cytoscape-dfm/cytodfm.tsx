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
    PerformanceMetrics,
    EdgePerformanceMetrics,
    NodePerformanceMetrics, AggregatedMetric
} from "../../redux/PerformanceQuery/performancequery.types";
import React from "react";
import {EdgeLabelMode} from "../../redux/UserSession/userSession.types";

const fileSaver = require('file-saver');


export type DirectlyFollowsMultigraph = {
    // The collection of all thresholds, used for threshold boxing.
    thresholds: number[]
    nodes: {
        label: string,
        // The old counts (sum of incoming edge counts) per each object type. (counts: { object type -> counts }).
        counts: { [key: string]: [number, number][] }
        // These are new node counts that correspond to actual OCEL events.
        ocel_counts: [number, number][]
        // The traces running through that node.
        traces: number[]
    }[],
    // The edges by object type, so subgraphs: object type -> Edge[]
    subgraphs: {
        [key: string]: {
            source: number,
            target: number,
            counts: [number, number][]
            // The traces running through that edge.
            traces: number[]
        }[]
    },
    traces: [
        {
            // Sometimes, we used actions synonymous to activity. If you keep on developing Explori, you would probably want to refactor that :D
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
    edgeLabelMode: EdgeLabelMode,
    infoboxEnabled: boolean
}

export interface CytoDFMMethods {
    exportAsJpg(): void;
}


// These are the icons of the "Process start" and "Process end" nodes. It is hideous this way, but it is the only way it works :(
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

// A trace to be rendered in the infobox.
type RenderTraceData = {
    id: number,
    activities: String[],
    count: number
}

// The traces running through the currently selected node / edge.
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

    // The currently selected node or edge for the infobox.
    const [selection, setSelection] = useState<CytoDFMSelectionState>({
        selectedNode: null,
        selectedEdge: null
    });
    // logAlignments and modelAlignments are used to visualize alignments in the graph.
    const [logAlignments, setLogAlignments] = useState<[string, AlignElement, AlignElement, AlignElement, string[][]][]>([]);
    const [modelAlignments, setModelAlignments] = useState<[string, AlignElement, AlignElement, string[][]][]>([]);
    const cytoscapeRef = useRef<cytoscape.Core | null>(null);

    // Open up the ability to export the graph to the parent component via the ref parameter.
    useImperativeHandle(ref, () => ({
        exportAsJpg() {
            if (cytoscapeRef.current == null)
                return;

            fileSaver.saveAs(cytoscapeRef.current.jpg(), "graph.jpg");
        }
    }));

    // We box the threshold to reduce the amount of re-renders.
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
    // This memo calculates the elements, i.e. nodes and edges, shown in the graph as well as the entries of the legend.
    const [elements, legendObjectTypeColors] = useMemo(() => {
        const dfm = props.dfm;
        const thresh = boxedThreshold;
        const selectedObjectTypes = props.selectedObjectTypes;
        const edgeHighlightingMode = props.highlightingMode;
        const edgeLabelMode = props.edgeLabelMode || {metric: "count", aggregate: "sum"};
        const performanceMetrics = props.performanceMetrics ? props.performanceMetrics : null;

        if (!dfm)
            return [[], []];

        // STEP 1: Add edges to the graph.
        // As a byproduct, we determine which object types appear at least once, which used for the legend.

        // Link = Cytoscape notation for edge.
        const links: any[] = [];
        const legendObjectTypeColors: [string, string][] = [];

        // The set of all nodes that have at least one connecting edge, introduced by Jan (?) at some point.
        // This might or might not be actually used, but we're currently too afraid to change
        // this shortly before the presentation.
        let allNodesOfSelectedObjectTypes = new Set<number>();
        // The method to determine object type colors depends on the total amount of object types, so we just cache
        // that value here.
        const numberOfColorsNeeded = Object.keys(dfm.subgraphs).length;

        // The edge highlighting mode determines the thickness of the edges. It might need to perform some pre-computations,
        // e.g. finding the max edge count, therefore it has the option to create arbitrary initial data.
        const highlightingInitialData = edgeHighlightingMode.createInitialData(dfm, props);

        Object.keys(dfm.subgraphs).forEach((objectType, i) => {
            if (selectedObjectTypes.includes(objectType)) {
                const objectTypeColor = getObjectTypeColor(numberOfColorsNeeded, i);

                const edges = dfm.subgraphs[objectType];
                let hasDisplayedEdge = false;

                //console.log(dfm.nodes)

                for (const edge of edges) {
                    let count: number = getCountAtThreshold(edge.counts, thresh);
                    // Edges that should be filtered out because of the threshold filtering have a count of zero, so we
                    // ignore them.
                    if (count === 0)
                        continue

                    const sourceLabel = dfm.nodes[edge.source].label;
                    const targetLabel = dfm.nodes[edge.target].label;
                    const label: string = getEdgePerformanceLabel(edgeLabelMode, performanceMetrics, sourceLabel, targetLabel, objectType, count);

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
                                    label,
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

                // Add the object type to the legend.
                if (hasDisplayedEdge)
                    legendObjectTypeColors.push([objectType, objectTypeColor]);
            }
        });

        //console.log(Array.from(allNodesOfSelectedObjectTypes));

        // STEP 2: Create the nodes.

        let filteredNodesLabels: string[] = []
        // Filter the nodes by threshold and object type and prepare them for forcegraph.
        const filteredNodes = Array.from(allNodesOfSelectedObjectTypes)
            .map((i: number) => {
                const node = dfm.nodes[i];
                // The filter count is the old displayed count, that basically was the sum of all incoming edge counts.
                // We use this count to filter nodes, because the OCEL-count is invariant to the selected object types.
                // Therefore, it might be possible that nodes have a display count > 0, but all object types connected
                // to the node are disabled.
                const filterCount = Object.keys(node.counts)
                    .filter((objectType) => selectedObjectTypes.includes(objectType))
                    .map((objectType) => getCountAtThreshold(node.counts[objectType], thresh))
                    .reduce((a, b) => a + b);

                if (filterCount === 0)
                    return null;

                const displayCount = getCountAtThreshold(node.ocel_counts, thresh);

                filteredNodesLabels.push(node.label)
                // The "convert_to_frontend_friendly_graph_notation" method of the DFM pre-filtering ensures that the
                // "Process start" node has the index 0 and the "Process end" node has the index 1. Those nodes
                // get some special treatment to make them look nicer.
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
                            label: `${node.label} (${displayCount})`,
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

                    // Check that all nodes which are used for the new edges exist
                    if (nodeIndices.indexOf(-1) > -1) {
                        break
                    }

                    // New nodes are created for the "extended" view.
                    const nodeLength: number = dfm.nodes.length + alignmentNodes.length
                    const sourceNodeIndex: number = nodeLength + 1
                    const targetNodeIndex: number = nodeLength + 2
                    let count: number | string = findMatchingTracesCount(traceNodeIndices, objectType, dfm.traces)
                    if (edgeLabelMode.metric !== "count") {
                        count = "";
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

                    // For simple mode, we simply need an edge from the lastNode to the nextNode.
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
                            // first edge
                            if ((source === lastNodeIndex && target === sourceNodeIndex) || (source === sourceNodeIndex && target === intermediateNodeIndex)) {
                                if (matchingFirstEdge !== null) {
                                    count = getCountAtThreshold(matchingFirstEdge.counts, thresh);
                                    if (edgeLabelMode.metric !== "count") {
                                        // const sourceLabel = dfm.nodes[matchingFirstEdge.source].label;
                                        // const targetLabel = dfm.nodes[matchingFirstEdge.target].label;
                                        // count = getEdgePerformanceLabel(props.performanceMode, performanceMetrics, sourceLabel, targetLabel, objectType, count)
                                        count = ""; // There won't be any performance metrics for edges involved in alignments.
                                    }
                                    classes = "edge"
                                }
                            }
                            // second edge
                            if ((source === intermediateNodeIndex && target === targetNodeIndex) || (source === targetNodeIndex && target === nextNodeIndex)) {
                                if (matchingSecondEdge !== null) {
                                    count = getCountAtThreshold(matchingSecondEdge.counts, thresh);
                                    if (edgeLabelMode.metric !== "count") {
                                        // const sourceLabel = dfm.nodes[matchingSecondEdge.source].label;
                                        // const targetLabel = dfm.nodes[matchingSecondEdge.target].label;
                                        // count = getEdgePerformanceLabel(props.performanceMode, performanceMetrics, sourceLabel, targetLabel, objectType, count)
                                        count = ""; // There won't be any performance metrics for edges involved in alignments.
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
                    // Check whether all nodes used for the new edge exist.
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
                    if (edgeLabelMode.metric !== "count") {
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

        //console.log(elements)

        return [elements, legendObjectTypeColors];
    }, [props.dfm, boxedThreshold, props.selectedObjectTypes, props.highlightingMode, modelAlignments, logAlignments, props.alignmentMode, props.performanceMetrics, props.edgeLabelMode]);


    // Determines the traces running through the currently selected node or edge as well as the corresponding performance metrics.
    const [selectedTraces, selectedPerformanceMetrics]: [SelectedTracesData, NodePerformanceMetrics | EdgePerformanceMetrics | null] = useMemo(() => {
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
        // Sort traces by count from most frequent to least frequent.
        Object.keys(shown).forEach((objectType) => {
            shown[objectType].sort((a, b) => a.count > b.count ? -1 : 1);
        });
        Object.keys(hidden).forEach((objectType) => {
            hidden[objectType].sort((a, b) => a.count > b.count ? -1 : 1);
        });

        let performanceMetrics: EdgePerformanceMetrics | NodePerformanceMetrics | null = null;
        if (props.performanceMetrics) {
            if (selection.selectedNode) {
                const selectedNodeLabel = dfm.nodes[selection.selectedNode].label;
                if (props.performanceMetrics.nodes[selectedNodeLabel])
                    performanceMetrics = props.performanceMetrics.nodes[selectedNodeLabel];
            } else if (selectedEdge != null && selection.selectedEdge) {
                const source = dfm.nodes[selectedEdge.source].label;
                const target = dfm.nodes[selectedEdge.target].label;
                const objectType = selection.selectedEdge[0];
                if (props.performanceMetrics.edges[source] &&
                    props.performanceMetrics.edges[source][target] &&
                    props.performanceMetrics.edges[source][target][objectType])
                    performanceMetrics = props.performanceMetrics.edges[source][target][objectType];
            }
        }

        return [{
            shown,
            hidden
        }, performanceMetrics]
    }, [props.dfm, props.performanceMetrics, boxedThreshold, props.selectedObjectTypes, selection]);


    if (!props.dfm) {
        return <div style={{height: "100%", minHeight: "80vh"}}/>;
    }

    // Now begin the Cytoscape "hacks" to make it behave as it should.
    // The first part is layouting algorithm, which is augmented by a custom transform function that fixes the node
    // positions of frozen nodes (UI to freeze individual nodes still missing, not sure whether that is a desirable
    // feature) or when the whole graph is frozen.
    // Just disabling layouting when the graph is frozen does not work because the user can still change the threshold
    // resulting in "unpositioned" nodes to be added to the graph.
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
        // Update the node position in the soft state.
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

    // For panning, cytoscape is nice and first triggers a "user input pan" event before triggering a
    // real "panning" event, so we can just pan back to the position in the soft state to block programmatic pans.
    // There is some additional logic required to adjust for the fact that zooming also pans the graph.
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
            } else {
                softState.current.pan = cytoscapeRef.current?.pan();
                // console.log("Updated zoom pan");
            }
        }
    }

    // For zooming, Cytoscape sadly is not as nice and first triggers the "zoom" event before triggering a "scrollzoom"
    // event. Therefore, the first zoom event is blocked. Afterwards, a grace period of 500ms allows the ensuing zooms
    // to go through, which will happen if the user scrolls with the mouse wheel.
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
    const availableObjectTypes = Object.keys(props.dfm.subgraphs);

    return (
        <div className="CytoDFM-container" id="DFM-container">
            <CytoscapeComponent
                elements={elements}
                stylesheet={graphStylesheet}
                layout={layout}
                style={{width: '100%', height: '100%'}}
                wheelSensitivity={0.2}
                pan={softState.current.pan ? softState.current.pan : {x: 0, y: 0}}
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

                    <InfoboxPerformanceMetrics metrics={selectedPerformanceMetrics}
                                               selection={selection}
                                               availableObjectTypes={availableObjectTypes}/>

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
    // Calculates the count specified by the counts separators at the given threshold.
    let rangeStart = 0;
    for (const [rangeEnd, count] of counts) {
        if (rangeStart <= threshold && threshold < rangeEnd)
            return count;
        rangeStart = rangeEnd;
    }
    return 0;
}

/**
 * Finds the correct edge which needs to be split and removed for the "extended" alignments view.
 * @param subgraph - subgraph with all edges
 * @param sourceIndex - The index from where the edge we want to find starts
 * @param targetIndex - The index where the edge we want to find ends
 */
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

/**
 * Finds the correct edge which needs to be split and removed for the "extended" alignments view.
 * @param edges - Current edges of the dfm
 * @param sourceIndex - The index from where the edge we want to find starts
 * @param targetIndex - The index where the edge we want to find ends
 * @param objectType -  The object type that the edge corresponds to
 */
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

/**
 * Creates a dict which maps nodes to their index.
 * @param nodes - The nodes for which the dict should be created.
 */
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

/**
 * Translates whole traces to node indices. Returns array of array of indices.
 * @param traces
 * @param nodeIndexDict
 */
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


function findMatchingTracesCount(alignmentTraces: number[][], objectType: string, traces: traceType[]): number {
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

function InfoboxPerformanceMetrics(props: {
    metrics: NodePerformanceMetrics | EdgePerformanceMetrics | null,
    selection: { selectedNode: any },
    availableObjectTypes: string[] }) {
    if (!props.metrics)
        return <React.Fragment/>

    function AggregatedMetricRow(props: { metric: AggregatedMetric | null, title: any }) {
        if (!props.metric)
            return <React.Fragment/>

        return (
            <React.Fragment>
                <div className="CytoDFM-Infobox-Metrics-Cell">
                    {props.title}
                </div>
                <div className="CytoDFM-Infobox-Metrics-Cell">
                    {secondsToHumanReadableFormat(props.metric.min, 2)}
                </div>
                <div className="CytoDFM-Infobox-Metrics-Cell">
                    {secondsToHumanReadableFormat(props.metric.mean, 2)}
                </div>
                <div className="CytoDFM-Infobox-Metrics-Cell">
                    {secondsToHumanReadableFormat(props.metric.max, 2)}
                </div>
                <div className="CytoDFM-Infobox-Metrics-Cell">
                    {secondsToHumanReadableFormat(props.metric.sum, 2)}
                </div>
            </React.Fragment>
        )
    }

    let metrics = <React.Fragment/>
    if (props.selection.selectedNode) {
        const nodeMetric = props.metrics as NodePerformanceMetrics;
        const hasWaitingTime = !!nodeMetric.waiting_time;
        metrics = (
            <React.Fragment>
                <React.Fragment>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Metric
                    </div>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Min
                    </div>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Mean
                    </div>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Max
                    </div>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Total
                    </div>
                </React.Fragment>
                <AggregatedMetricRow metric={nodeMetric.service_time} title="Service time"/>
                {
                    hasWaitingTime && (
                        <React.Fragment>
                            <AggregatedMetricRow metric={nodeMetric.waiting_time} title="Waiting time"/>
                            <AggregatedMetricRow metric={nodeMetric.sojourn_time} title="Sojourn time"/>
                            <div className="CytoDFM-Infobox-Metrics-Divider"/>
                            <AggregatedMetricRow metric={nodeMetric.lagging_time} title="Lagging time"/>
                            <AggregatedMetricRow metric={nodeMetric.synchronization_time} title="Sync time"/>
                            <AggregatedMetricRow metric={nodeMetric.flow_time} title="Flow time"/>
                            <div className="CytoDFM-Infobox-Metrics-Divider"/>
                            <React.Fragment>
                                <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Divider">
                                    Pooling time
                                </div>
                                {
                                    props.availableObjectTypes.map((objectType, index) => {
                                        const metric = nodeMetric.pooling_times[objectType];
                                        if (!metric)
                                            return <React.Fragment />

                                        const color = getObjectTypeColor(props.availableObjectTypes.length, index);
                                        const metricTitle = (
                                            <React.Fragment>
                                                <div className="CytoDFM-Legend-Circle" style={{backgroundColor: color}}>
                                                </div>
                                                {objectType}
                                            </React.Fragment>
                                        )

                                        return <AggregatedMetricRow metric={metric} title={metricTitle} key={`pooling-time-${objectType}`} />;
                                    })
                                }
                            </React.Fragment>
                        </React.Fragment>
                    )
                }
            </React.Fragment>)
    }
    else {
        const edgeMetrics = props.metrics as EdgePerformanceMetrics;
        metrics = (
            <React.Fragment>
                <React.Fragment>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Metric
                    </div>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Min
                    </div>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Mean
                    </div>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Max
                    </div>
                    <div className="CytoDFM-Infobox-Metrics-Cell CytoDFM-Infobox-Metrics-Header">
                        Total
                    </div>
                </React.Fragment>
                <AggregatedMetricRow metric={edgeMetrics.pooling_time} title="Pooling time"/>
                <AggregatedMetricRow metric={edgeMetrics.waiting_time} title="Waiting time"/>
            </React.Fragment>)
    }
    return (
        <div className="CytoDFM-Infobox-Metrics-Grid">
            {metrics}
        </div>
    )
}

function InfoboxTraces(props: { title: string, traces: { [key: string]: RenderTraceData[] }, keyPrefix: string, legendColors: [string, string][] }) {
    if (Object.keys(props.traces).length === 0)
        return <React.Fragment/>

    return <React.Fragment>
        <h4 className="CytoDFM-Infobox-Traces-Header">{props.title}</h4>
        {Object.entries(props.traces).map(([objectType, traces]) => {
            const potentialColor = props.legendColors.find(([ot, _]) => (ot === objectType))
            let color = "";
            if (potentialColor !== undefined){
                color = props.legendColors.find(([ot, _]) => (ot === objectType))![1];
            }
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

function getEdgePerformanceLabel(labelMode: EdgeLabelMode,
                                 performanceMetrics: PerformanceMetrics | null,
                                 source: string, target: string, object_type: string,
                                 count: number): string {
    // Determines the appropriate label for the edge depending on the given edge labeling mode and the availability
    // of performance metrics.

    if (!labelMode || labelMode.metric === "count")
        return count.toString();

    if (!performanceMetrics)
        return "";
    if (!performanceMetrics.edges[source])
        return "";
    if (!performanceMetrics.edges[source][target])
        return "";
    if (!performanceMetrics.edges[source][target][object_type])
        return "";
    const edgeMetrics = performanceMetrics.edges[source][target][object_type] as any;
    const metric = edgeMetrics[labelMode.metric][labelMode.aggregate] as number;
    if (labelMode.aggregate !== "stdev")
        return secondsToHumanReadableFormat(metric, 2);
    else
        return metric.toString()
}