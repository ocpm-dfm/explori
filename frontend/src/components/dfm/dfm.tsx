import ForceGraph2D, {ForceGraphMethods} from "react-force-graph-2d";
import {useRef, useState} from "react";

import './dfm.css';

export type DirectlyFollowsMultigraph = {
    nodes: {
        label: string,
        threshold: number
        counts: [number, number][]
    }[],
    subgraphs: {[key:string]: {
            source: number,
            target: number,
            threshold: number
            counts: [number, number][]
        }[]}
}


type FilteredDFMState = {
    node_positions: {[key:number]: [number, number]}
}


type FilteredNode = {
    id: number,
    label: string,
    x: number | undefined,
    y: number | undefined
    fx: number | undefined
    fy: number | undefined
}

const linkColors = [
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

// https://stackoverflow.com/questions/1484506/random-color-generator/7419630#7419630
function rainbow(numColors: number, colorIndex: number) {
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

    let color = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return color;
}


export const FilteredDFM = (props: {dfm: DirectlyFollowsMultigraph | null, threshold: number, selectedObjectTypes: string[]}) => {
    const dfm = props.dfm;
    const thresh = props.threshold;
    const selectedObjectTypes = props.selectedObjectTypes;

    const [state, setState] = useState<FilteredDFMState>({
        node_positions: {}
    });
    const forceGraphRef = useRef<ForceGraphMethods>();

    if (dfm === null) {
        return <div style={{ height: '80vh' }} />
    }

    // Edge counts keeps track of how many edges exist between two nodes thus far.
    const edgeCounts: {[key:number]:{[key:number]:number}} = {}
    const links: any[] = [];
    const legendObjectTypeColors: [string, string][] = [];

    let allNodesOfSelectedObjectTypes = new Set<number>();

    Object.keys(dfm.subgraphs).forEach((objectType, i) => {
        if (selectedObjectTypes.includes(objectType)) {
            const objectTypeColor = rainbow(Object.keys(dfm.subgraphs).length, i);

            const edges = dfm.subgraphs[objectType];
            for (const edge of edges) {

                // Ignore edges below the threshold
                if (thresh < edge.threshold)
                    continue;

                // Determine the edge nr of the current edge (starting with zero).
                let edgeNr = 0;
                if (edgeCounts[edge.source]) {
                    if (edgeCounts[edge.source][edge.target])
                        edgeNr = edgeCounts[edge.source][edge.target]++; // I hate this but also I am lazy.
                    else
                        edgeCounts[edge.source][edge.target] = 1; // Edge number remains zero.
                } else {
                    edgeCounts[edge.source] = {};
                    edgeCounts[edge.source][edge.target] = 1; // Edge number remains zero.
                }
                // Now, edgeNr = edgeCounts[edge.source][edge.target] - 1

                links.push({
                    source: edge.source,
                    target: edge.target,
                    label: `${getCountAtThreshold(edge.counts, thresh)}`,
                    color: objectTypeColor,
                    curvature: getCurvature(edgeNr),
                    objectType
                });

                allNodesOfSelectedObjectTypes.add(edge.source);
                allNodesOfSelectedObjectTypes.add(edge.target);
            }

            legendObjectTypeColors.push([objectType, objectTypeColor]);
        }
    });

    // Filter the nodes by threshold and object type and prepare them for forcegraph.
    const filteredNodes: FilteredNode[] = Array.from(allNodesOfSelectedObjectTypes)
        .filter(i => (thresh >= dfm.nodes[i].threshold))        // Removes nodes that are below our threshold.
        .map((i: number) => (
            {
                id: i,
                label: `${dfm.nodes[i].label} (${getCountAtThreshold(dfm.nodes[i].counts, thresh)})`,
                // Use position from state if is known.
                ...((state.node_positions[i] !== undefined) ?
                    {
                        x: state.node_positions[i][0],
                        fx: state.node_positions[i][0],
                        y: state.node_positions[i][1],
                        fy: state.node_positions[i][1],
                    } :
                    {
                        x: undefined,
                        fx: undefined,
                        y: undefined,
                        fy: undefined
                    })
            }
        ));


    const graphData = {
        nodes: filteredNodes,
        links
    }

    const pageBgColor = getComputedStyle(document.documentElement).getPropertyValue('background-color');
    const nodeBgColor = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--node-color')})`;
    const nodeTextColor = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--node-text')})`;

    function storeNodePositions() {
        const node_positions: {[key:number]: [number, number]} = {};
        // Keep the positions of nodes that were filtered.
        for (let nodeId = 0; nodeId < allNodesOfSelectedObjectTypes.size; nodeId += 1)
            if (state.node_positions[nodeId])
                node_positions[nodeId] = state.node_positions[nodeId];

        // Update the with the positions from the rendered graph.
        let positionsHaveChanged: boolean = false;
        for (const node of filteredNodes) {
            if (node.x !== undefined && node.y !== undefined) {
                if (state.node_positions[node.id]) {
                    if (node.x !== state.node_positions[node.id][0] || node.y !== state.node_positions[node.id][1]) {
                        positionsHaveChanged = true;
                    }
                } // Those braces are needed, because otherwise the "else" is matched to the inner if statement.
                else
                    positionsHaveChanged = true;

                node_positions[node.id] = [node.x, node.y];
            }
        }

        // Update the state.
        if (positionsHaveChanged)
            setState((old) => Object.assign({}, old, {node_positions}));
    }

    return (
        <div className="DFM-container" id="DFM-container">
            <ForceGraph2D graphData={graphData} ref={forceGraphRef}
                          height={.8 * window.innerHeight}
                          linkCurvature="curvature"
                          linkDirectionalArrowLength={3.5}
                          linkDirectionalArrowRelPos={1}
                          linkColor="color"
                          linkLabel="label"
                          backgroundColor={pageBgColor}
                          nodeCanvasObject={(node, ctx, _globalScale) => {
                              const tsNode = node as FilteredNode;
                              const label: string = tsNode.label;
                              const x = tsNode.x;
                              const y = tsNode.y;

                              if (x === undefined || y === undefined)
                                  return;

                              const fontSize = 6;
                              ctx.font = `${fontSize}px Sans-Serif`;
                              const textWidth = ctx.measureText(label).width;

                              const padding = fontSize * 0.4;
                              const [w, h] = [textWidth + padding, fontSize + padding];

                              const r = Math.min(Math.min(w, h) / 4, 25)
                              ctx.fillStyle = nodeBgColor;
                              // https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-using-html-canvas
                              ctx.beginPath();
                              ctx.moveTo(x+r-w/2, y-h/2);
                              ctx.arcTo(x+w/2,y-h/2,x+w/2,y+h/2, r);
                              ctx.arcTo(x+w/2,y+h/2,x-w/2,y+h/2, r);
                              ctx.arcTo(x-w/2,y+h/2,x-w/2,y-h/2, r);
                              ctx.arcTo(x-w/2,y-h/2,x+w/2,y-h/2, r);
                              ctx.closePath();
                              ctx.fill();

                              ctx.rect(x - w / 2, y - h / 2, w , h);

                              ctx.textAlign = 'center';
                              ctx.textBaseline = 'middle';
                              ctx.fillStyle = nodeTextColor;
                              ctx.fillText(label, x, y);

                              // @ts-ignore
                              node.__bckgDimensions = [w, h]; // to re-use in nodePointerAreaPaint
                          }}
                          nodePointerAreaPaint={(node, color, ctx) => {
                              ctx.fillStyle = color;
                              // @ts-ignore
                              const bckgDimensions = node.__bckgDimensions;
                              // @ts-ignore
                              bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
                          }}
                          nodeCanvasObjectMode={() => 'replace'}
                          cooldownTime={2000}
                          onEngineStop={() => {
                              console.log("Engine stop")

                              // Freeze node positions.
                              for (const node of filteredNodes) {
                                  if (node.x !== undefined && node.y !== undefined) {
                                      node.fx = node.x;
                                      node.fy = node.y;
                                  }
                              }

                              storeNodePositions();
                          }}
                          onNodeDragEnd={() => storeNodePositions()}
            />
            { legendObjectTypeColors.length > 0 &&
                <ul className="DFM-Legend">
                    {
                        legendObjectTypeColors.map(([type, color]) => (
                            <li key={type}>
                                <div className="DFM-Legend-Circle" style={{backgroundColor: color}}>
                                </div>
                                {type}
                            </li>
                        ))
                    }
                </ul>
            }
        </div>

    )
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


function getCurvature(edgeNr: number): number {
    if ((edgeNr % 2) === 0)
        return - (edgeNr / 4)
    else
        return (edgeNr - 1) / 4 + 0.5
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCanvas(): HTMLCanvasElement | null {
    // forceGraphRef.current && forceGraphRef.current?.resumeAnimation();
    const containerElement = document.getElementById('DFM-container');
    if (containerElement) {
        for (let i = 0; i < containerElement.children.length; i += 1) {
            const child = containerElement.children.item(i);
            if (child && child.className.length === 0) {
                const child2 = child.children.item(0);
                if (child2) {
                    for (let j = 0; j < child2.children.length; j += 1) {
                        const child3 = child2.children.item(j);
                        if (child3 && (child3 instanceof HTMLCanvasElement)) {
                            return child3;
                        }
                    }
                }
            }
        }
    }
    return null;
}