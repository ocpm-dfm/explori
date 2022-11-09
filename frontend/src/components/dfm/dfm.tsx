import ForceGraph2D, {ForceGraphMethods} from "react-force-graph-2d";
import {useRef, useState} from "react";


export type DirectlyFollowsMultigraph = {
    nodes: {
        label: string,
        threshold: number
    }[],
    subgraphs: {[key:string]: {
           source: number,
           target: number,
           threshold: number
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


export const FilteredDFM = (props: {dfm: DirectlyFollowsMultigraph, threshold: number}) => {
    const dfm = props.dfm;
    const thresh = props.threshold;

    const [state, setState] = useState<FilteredDFMState>({
        node_positions: {}
    });
    const forceGraphRef = useRef<ForceGraphMethods>();

    if (dfm === undefined) {
        setState({
            node_positions: {}
        });
        return <div />
    }

    // Filter the nodes by threshold and prepare them for forcegraph.
    const filteredNodes: FilteredNode[] = [...Array(dfm.nodes.length).keys()]   // Generates 0, 1, 2, ..., dfm.nodes.length - 1
        .filter(i => (thresh >= dfm.nodes[i].threshold))        // Removes nodes that are below our threshold.
        .map((i: number) => (
            {
                id: i,
                label: dfm.nodes[i].label,
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

    // Edge counts keeps track of how many edges exist between two nodes thus far.
    const edgeCounts: {[key:number]:{[key:number]:number}} = {}
    const links: any[] = [];
    let colorIndex = 0;
    for (const objectType of Object.keys(dfm.subgraphs)) {
        const objectTypeColor = linkColors[colorIndex];
        colorIndex = (colorIndex + 1) % linkColors.length;

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
            }
            else {
                edgeCounts[edge.source] = {};
                edgeCounts[edge.source][edge.target] = 1; // Edge number remains zero.
            }
            // Now, edgeNr = edgeCounts[edge.source][edge.target] - 1

            // Alternate curvature to be left or right, first edge is straight.
            const curvature: number = ((edgeNr % 2 === 0) ? 1 : -1) * edgeNr / 2;

            links.push({
                source: edge.source,
                target: edge.target,
                color: objectTypeColor,
                curvature,
                objectType
            })
        }
    }

    const graphData = {
        nodes: filteredNodes,
        links
    }

    const nodeBgColor = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--node-color')})`;
    const nodeTextColor = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--node-text')})`;

    function storeNodePositions() {
        const node_positions: {[key:number]: [number, number]} = {};
        for (const node of filteredNodes) {
            if (node.x !== undefined && node.y !== undefined) {
                node_positions[node.id] = [node.x, node.y];
            }
        }
        setState((old) => Object.assign({}, old, {node_positions}));
    }

    return (
        <ForceGraph2D graphData={graphData} ref={forceGraphRef}
                      height={.9 * window.innerHeight}
                      linkCurvature="curvature"
                      linkDirectionalArrowLength={3.5}
                      linkDirectionalArrowRelPos={1}
                      linkColor="color"
                      nodeCanvasObject={(node, ctx, globalScale) => {
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

                          // forceGraphRef.current && forceGraphRef.current?.resumeAnimation();
                      }}
                      onNodeDragEnd={() => storeNodePositions()}
                      // dagMode="td"
        />
    )
}