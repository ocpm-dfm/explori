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
import {getObjectTypeColor} from "../../utils";
import {EdgeHighlightingMode} from "./EdgeHighlighters";

import {AlignmentsData} from "../../pages/Alignments/Alignments";
import {AlignElement} from "../../redux/AlignmentsQuery/alignmentsquery.types";
import {log} from "util";

const fileSaver = require('file-saver');


export type DirectlyFollowsMultigraph = {
    thresholds: number[]
    nodes: {
        label: string,
        counts: {[key:string]: [number, number][]}
        traces: number[]
    }[],
    subgraphs: {[key:string]: {
            source: number,
            target: number,
            counts: [number, number][]
            traces: number[]
        }[]},
    traces: [
        {
            actions: number[]
            thresholds: {[key:string]: {
                    count: number
                    threshold: number
                }}
        }
    ]
}


export type CytoDFMProps = {
    dfm: DirectlyFollowsMultigraph | null,
    threshold: number,
    selectedObjectTypes: string[],
    positionsFrozen: boolean,
    highlightingMode: EdgeHighlightingMode,
    graphHorizontal: boolean,
    showAlignments: boolean,
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
    shown: {[key:string]: RenderTraceData[]},
    hidden: {[key: string]: RenderTraceData[]}
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

export const FilteredCytoDFM = forwardRef ((props: CytoDFMProps, ref: ForwardedRef<CytoDFMMethods | undefined>) =>
{
    // We don't actually want to rerender when the state changes, but we want it to persist accross rerenders.
    // That is why we use useRef instead of useState.
    const softState = useRef<CytoDFMSoftState>({
        nodeStates: initializeNodePositions(props.dfm),
    });
    // Automatically reset node positions when the DFM changes.
    useEffect(() => {
        softState.current = {
            nodeStates: initializeNodePositions(props.dfm)
        }
    }, [props.dfm]);

    const [selection, setSelection] = useState<CytoDFMSelectionState>({
        selectedNode: null,
        selectedEdge: null
    });
    const [logAlignments, setLogAlignments] = useState<[string, AlignElement, AlignElement, AlignElement][]>([]);
    const [modelAlignments, setModelAlignments] = useState<[string, AlignElement, AlignElement][]>([]);
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

        console.log("Filtering", dfm, selectedObjectTypes, thresh);


        if (!dfm)
            return [[], []];

        console.log(logAlignments)
        console.log(modelAlignments)

        const links: any[] = [];
        const legendObjectTypeColors: [string, string][] = [];

        let allNodesOfSelectedObjectTypes = new Set<number>();
        const numberOfColorsNeeded = Object.keys(dfm.subgraphs).length;

        const highlightingInitialData = edgeHighlightingMode.createInitialData(dfm, props);

        Object.keys(dfm.subgraphs).forEach((objectType, i) => {
            if (selectedObjectTypes.includes(objectType)) {
                const objectTypeColor = getObjectTypeColor(numberOfColorsNeeded, i);

                const edges = dfm.subgraphs[objectType];
                let hasDisplayedEdge = false;

                for (const edge of edges)
                {
                    const count = getCountAtThreshold(edge.counts, thresh);
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
                                    color: objectTypeColor,
                                    width,

                                    objectType,
                                    sourceAsNumber: edge.source,
                                    targetAsNumber: edge.target
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

        console.log(dfm)

        let alignmentNodes = []
        let alignmentEdges = []

        if(props.showAlignments) {
            for (const [objectType, lastActivity, intermediateActivity, nextActivity] of logAlignments) {
                if (selectedObjectTypes.includes(objectType)) {
                    const objectTypeColor = getObjectTypeColor(numberOfColorsNeeded, 0);

                    let lastNodeIndex: number = -1, intermediateNodeIndex: number = -1, nextNodeIndex: number = -1;
                    const nodes = dfm.nodes

                    for (let i = 0; i < nodes.length; i++) {
                        switch (nodes[i].label) {
                            case lastActivity.activity:
                                lastNodeIndex = i
                                break;
                            case intermediateActivity.activity:
                                intermediateNodeIndex = i
                                break;
                            case nextActivity.activity:
                                nextNodeIndex = i
                                break;
                        }
                    }
                    /*console.log(lastNodeIndex)
                    console.log(intermediateNodeIndex)
                    console.log(nextNodeIndex) */
                    const nodeIndices = [lastNodeIndex, intermediateNodeIndex, nextNodeIndex]

                    if (nodeIndices.indexOf(-1) > -1) {
                        break
                    }

                    const nodeLength: number = dfm.nodes.length + alignmentNodes.length
                    const sourceNodeIndex: number = nodeLength + 1
                    const targetNodeIndex: number = nodeLength + 2
                    const count: number = 0

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

                    const neededEdges: number[][] = [
                        // need edge between these two nodes
                        [sourceNodeIndex, targetNodeIndex],
                        // need edge between lastNode and sourceNode
                        [lastNodeIndex, sourceNodeIndex],
                        // need edge between sourceNode and intermediateNode
                        [sourceNodeIndex, intermediateNodeIndex],
                        // need edge between intermediateNode and targetNode
                        [intermediateNodeIndex, targetNodeIndex],
                        // need edge between targetNode and nextNode
                        [targetNodeIndex, nextNodeIndex]
                    ]

                    for (const [source, target] of neededEdges) {
                        const classes = ""

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
                                        sourceAsNumber: source,
                                        targetAsNumber: target
                                    },
                                classes
                            });

                        allNodesOfSelectedObjectTypes.add(source);
                        allNodesOfSelectedObjectTypes.add(target);
                    }
                }
            }

            for (const [objectType, lastActivity, nextActivity] of logAlignments) {
                if (selectedObjectTypes.includes(objectType)) {
                    const objectTypeColor = getObjectTypeColor(numberOfColorsNeeded, 0);

                    let lastNodeIndex: number = -1, nextNodeIndex: number = -1;
                    const nodes = dfm.nodes

                    for (let i = 0; i < nodes.length; i++) {
                        switch (nodes[i].label) {
                            case lastActivity.activity:
                                lastNodeIndex = i
                                break;
                            case nextActivity.activity:
                                nextNodeIndex = i
                                break;
                        }
                    }
                    //console.log(lastNodeIndex)
                    //console.log(nextNodeIndex)
                    const nodeIndices = [lastNodeIndex, nextNodeIndex]

                    if (nodeIndices.indexOf(-1) > -1) {
                        break
                    }

                    const nodeLength: number = dfm.nodes.length + alignmentNodes.length
                    const sourceNodeIndex: number = nodeLength + 1
                    const count: number = 0

                    // need node between lastNode and nextNode
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

                    const neededEdges: number[][] = [
                        // need loop on new node
                        [sourceNodeIndex, sourceNodeIndex],
                        // need edge between lastNode and sourceNode
                        [lastNodeIndex, sourceNodeIndex],
                        // need edge between sourceNode and nextNode
                        [sourceNodeIndex, nextNodeIndex]
                    ]

                    for (const [source, target] of neededEdges) {
                        let classes = ""
                        if (source === target) {
                            classes = "loop";
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
                                        sourceAsNumber: source,
                                        targetAsNumber: target
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
    }, [props.dfm, boxedThreshold, props.selectedObjectTypes, props.highlightingMode, modelAlignments, logAlignments, props.showAlignments]);


    const selectedTraces = useMemo(() => {
        const dfm = props.dfm;
        const thresh = boxedThreshold;
        let selectedObjectTypes = props.selectedObjectTypes;

        if (dfm === null)
            return { shown: {}, hidden: {} } as SelectedTracesData;

        let selectedTraces = null;

        if (selection.selectedNode !== null)
            selectedTraces = dfm.nodes[selection.selectedNode].traces;
        else if (selection.selectedEdge !== null) {
            const [objectType, source, target] = selection.selectedEdge;
            const allEdges = dfm.subgraphs[objectType];
            for (const edge of allEdges) {
                if (edge.source === source && edge.target === target) {
                    selectedTraces = edge.traces;
                    break;
                }
            }

            // Only show traces of the correct object type.
            selectedObjectTypes = [objectType];
        }

        if (selectedTraces == null)
            return { shown: {}, hidden: {} } as SelectedTracesData;


        const shown: {[key:string]:RenderTraceData[]} = {};
        const hidden: RenderTraceData[] = [];
        selectedTraces.forEach((traceId) => {
            const trace = dfm.traces[traceId];
            const activities = trace.actions
                .filter((nodeId) => nodeId > 1)
                .map((nodeId) => dfm.nodes[nodeId].label);

            Object.keys(trace.thresholds).forEach((objectType) => {
               if (thresh < trace.thresholds[objectType].threshold)
                   return;
               if (!selectedObjectTypes.includes(objectType))
                   return;

               if (!shown[objectType])
                   shown[objectType] = [];

               shown[objectType].push({
                   id: traceId,
                   activities,
                   count: trace.thresholds[objectType].count
               })
            });
        });
        Object.keys(shown).forEach((objectType) => {
            shown[objectType].sort((a, b) => a.count > b.count ? -1 : 1);
        });

        return {
            shown,
            hidden
        }
    }, [props.dfm, boxedThreshold, props.selectedObjectTypes, selection]);


    if (!props.dfm) {
        // Reset the state if necessary.
        return <div style={{height: "100%", minHeight: "80vh"}} />;
    }

    const layout = {
        name: 'elk',
        spacingFactor: 1,
        transform: (node: any, pos: {x: number, y: number}) => {
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
        const edgeData: { objectType: string, sourceAsNumber: number, targetAsNumber: number } = event.target.data();
        setSelection({
            selectedNode: null,
            selectedEdge: [edgeData.objectType, edgeData.sourceAsNumber, edgeData.targetAsNumber]
        });
    }

    function registerEvents(cy: cytoscape.Core) {
        cytoscapeRef.current = cy;

        cy.on("dragfreeon", "node", (event: EventObject) => onNodeDrag(event));

        cy.on('tap', "node", (event: EventObject) => onNodeTap(event));
        cy.on('tap', 'edge', (event: EventObject) => onEdgeTap(event));
    }

    const hasSelectedObject = selection.selectedNode !== null || selection.selectedEdge !== null;

    return (
        <div className="CytoDFM-container" id="DFM-container">
            <CytoscapeComponent
                elements={elements}
                stylesheet={graphStylesheet}
                layout={layout}
                style={ { width: '100%', height: '100%' } }
                wheelSensitivity={0.2}
                cy={registerEvents}
            />
            { props.showAlignments && (
                <AlignmentsData
                    setLogAlignments={setLogAlignments}
                    setModelAlignments={setModelAlignments}
                ></AlignmentsData>
            )}
            { legendObjectTypeColors.length > 0 &&
                <ul className="CytoDFM-Overlay CytoDFM-Legend">
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
                hasSelectedObject && selectedTraces !== null &&
                <div className="CytoDFM-Overlay CytoDFM-Infobox">
                    {
                        selection.selectedNode !== null &&
                        <h3 className="CytoDFM-Infobox-Header">
                            Activity: { props.dfm.nodes[selection.selectedNode].label }
                        </h3>
                    }
                    {
                        selection.selectedEdge !== null &&
                        <h3 className="CytoDFM-Infobox-Header">
                            Edge: { props.dfm.nodes[selection.selectedEdge[1]].label } to { props.dfm.nodes[selection.selectedEdge[2]].label }
                        </h3>
                    }
                    <ul>
                        {
                            Object.keys(selectedTraces.shown).map((objectType) => (
                                <li key={`traces-${objectType}`}>
                                    <span>{objectType}</span>

                                    <ul>
                                        {
                                            selectedTraces.shown[objectType].map((trace: RenderTraceData) => (
                                                <li key={`trace-${objectType}-${trace.id}`}>
                                                    {trace.count} x {trace.activities.reduce((a, b) => a + ", " + b)}
                                                </li>
                                            ))
                                        }
                                    </ul>
                                </li>
                            ))
                        }
                    </ul>
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