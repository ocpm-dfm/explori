import CytoscapeComponent from "react-cytoscapejs";

import './cytodfm.css';
import {useEffect, useMemo, useRef, useState} from "react";
import cytoscape, {EventObject} from "cytoscape";


export type DirectlyFollowsMultigraph = {
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



const preselectedColors = [
    '#E53935',
    '#1E88E5',
    '#7CB342',
    '#FF9800',
    '#5E35B1',
    '#FDD835',
    '#00897B',
    '#D81B60',
    '#795548'
]
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

// https://stackoverflow.com/questions/1484506/random-color-generator/7419630#7419630
function generateColors(numColors: number, colorIndex: number) {
    let h = colorIndex / numColors;
    let i = ~~(h * 6);
    let f = h * 6 - i;
    let q = 1 - f;

    let r, g, b;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
        default: r = 0; g = 0; b = 0; break; // to make typescript happy and avoid r,g,b "possibly" being undefined
    }

    return "#" + ("00" + (~~(r * 255)).toString(16)).slice(-2) + ("00" + (~~(g * 255)).toString(16)).slice(-2) + ("00" + (~~(b * 255)).toString(16)).slice(-2);
}

// Either choose from preselected set of colors or generate an arbitrary amount of colors if not enough were preselected.
// Note that we cannot mix these two approaches and give back preselected colors until we don't have enough and then use
// the color generation as we currently can't make sure we don't generate a color that's identical (or too close) to a
// preselected (and already returned and therefore used) color.
function getEdgeColor(numberOfColorsNeeded: number, indexOfCurrentColor: number) {
    console.assert(indexOfCurrentColor >= 0 && indexOfCurrentColor < numberOfColorsNeeded);

    if(numberOfColorsNeeded <= preselectedColors.length) {
        return preselectedColors[indexOfCurrentColor];
    } else {
        return generateColors(numberOfColorsNeeded, indexOfCurrentColor);
    }
}


interface NodeState {
    x: number | null
    y: number | null
    frozen: boolean
}

interface CytoDFMState {
    nodeStates: NodeState[],
}

type RenderTraceData = {
    id: number,
    activities: String[],
    count: number
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

export const FilteredCytoDFM = (props: {
    dfm: DirectlyFollowsMultigraph | null,
    threshold: number,
    selectedObjectTypes: string[],
    positionsFrozen: boolean}) =>
{
    // We don't actually want to rerender when the state changes, but we want it to persist accross rerenders.
    // That is why we use useRef instead of useState.
    const softState = useRef<CytoDFMState>({
        nodeStates: initializeNodePositions(props.dfm),
    });
    // Automatically reset node positions when the DFM changes.
    useEffect(() => {
        softState.current = {
            nodeStates: initializeNodePositions(props.dfm)
        }
    }, [props.dfm]);

    const [selected, setSelected] = useState<number | null>(null);

    // The usage of useMemo reduces the number of rerenders, hence performance.
    const [elements, legendObjectTypeColors] = useMemo(() => {
        const dfm = props.dfm;
        const thresh = props.threshold;
        const selectedObjectTypes = props.selectedObjectTypes;

        if (!dfm)
            return [[], []];

        const links: any[] = [];
        const legendObjectTypeColors: [string, string][] = [];

        let allNodesOfSelectedObjectTypes = new Set<number>();
        const numberOfColorsNeeded = Object.keys(dfm.subgraphs).length;

        Object.keys(dfm.subgraphs).forEach((objectType, i) => {
            if (selectedObjectTypes.includes(objectType)) {
                const objectTypeColor = getEdgeColor(numberOfColorsNeeded, i);

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

                    links.push(
                        {
                            data:
                                {
                                    source: `${edge.source}`,
                                    target: `${edge.target}`,
                                    label: `${count}`,
                                    color: objectTypeColor,
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
        const elements: cytoscape.ElementDefinition[] = filteredNodes.concat(links);

        return [elements, legendObjectTypeColors];
    }, [props.dfm, props.threshold, props.selectedObjectTypes]);


    const selectedTraces = useMemo(() => {
        const dfm = props.dfm;
        const thresh = props.threshold;
        const selectedObjectTypes = props.selectedObjectTypes;

        if (selected === null || dfm === null)
            return { shown: {}, hidden: [] };

        const selectedTraces = dfm.nodes[selected].traces;


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
        })

        return {
            shown,
            hidden
        }
    }, [props.dfm, props.threshold, props.selectedObjectTypes, selected]);


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
            'elk.direction': 'DOWN',
            'spacing.portsSurrounding': 20,
            "spacing.nodeNodeBetweenLayers": 100
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
        setSelected(event.target.data().numberId);
    }

    function registerEvents(cy: cytoscape.Core) {
        cy.on("dragfreeon", "node", (event: EventObject) => onNodeDrag(event));

        cy.on('tap', "node", (event: EventObject) => onNodeTap(event));
    }

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
                selected !== null && selectedTraces !== null &&
                <div className="CytoDFM-Overlay CytoDFM-Infobox">
                    { props.dfm.nodes[selected].label }
                    <ul>
                        {
                            Object.keys(selectedTraces.shown).map((objectType) => (
                                <li key={`traces-${objectType}`}>
                                    <span>{objectType}</span>

                                    <ul>
                                        {
                                            selectedTraces.shown[objectType].map((trace) => (
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
}

function getCountAtThreshold(counts: [number, number][], threshold: number): number {
    let rangeStart = 0;
    for (const [rangeEnd, count] of counts) {
        if (rangeStart <= threshold && threshold < rangeEnd)
            return count;
        rangeStart = rangeEnd;
    }
    return 0;
}