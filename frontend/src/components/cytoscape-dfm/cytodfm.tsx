import CytoscapeComponent from "react-cytoscapejs";
import {DirectlyFollowsMultigraph} from "../dfm/dfm";


type FilteredNode = {
    id: number,
    label: string,
    x: number | undefined,
    y: number | undefined
    fx: number | undefined
    fy: number | undefined
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

    let color = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return color;
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

export const FilteredCytoDFM = (props: {
    dfm: DirectlyFollowsMultigraph | null,
    threshold: number,
    selectedObjectTypes: string[]}) =>
{
    // const elements = [
    //     { data: { id: 'one', label: 'Node 1' }, classes: 'activity' },
    //     { data: { id: 'two', label: 'Node 2' }, classes: 'activity' },
    //     { data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' }, classes: "bezier" },
    //     { data: { source: 'one', target: 'two', label: 'Edge 2 from Node1 to Node2', color: "#E53935" }, classes: "bezier" },
    // ];

    const dfm = props.dfm;
    const thresh = props.threshold;
    const selectedObjectTypes = props.selectedObjectTypes;

    if (!dfm) {
        return <div style={{height: "100%"}} />;
    }


    const links: any[] = [];
    const legendObjectTypeColors: [string, string][] = [];

    let allNodesOfSelectedObjectTypes = new Set<number>();
    const numberOfColorsNeeded = Object.keys(dfm.subgraphs).length;
    const nodeDegrees: {[key:number]:number} = {}

    Object.keys(dfm.subgraphs).forEach((objectType, i) => {
        if (selectedObjectTypes.includes(objectType)) {
            const objectTypeColor = getEdgeColor(numberOfColorsNeeded, i);

            const edges = dfm.subgraphs[objectType];
            let hasDisplayedEdge = false;

            for (const edge of edges) {
                // Ignore edges below the threshold
                if (thresh < edge.threshold)
                    continue;
                hasDisplayedEdge = true;

                const count = getCountAtThreshold(edge.counts, thresh);

                let classes = "";
                if (edge.source == edge.target)
                    classes = "loop";

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

                if (nodeDegrees[edge.source])
                    nodeDegrees[edge.source] -= count;
                else
                    nodeDegrees[edge.source] = -count;
                if (nodeDegrees[edge.target])
                    nodeDegrees[edge.target] += count;
                else
                    nodeDegrees[edge.target] = count;
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
        .filter(i => (thresh >= dfm.nodes[i].threshold))        // Removes nodes that are below our threshold.
        .map((i: number) => (
            {
                data: {
                    id: `${i}`,
                    label: `${dfm.nodes[i].label} (${getCountAtThreshold(dfm.nodes[i].counts, thresh)})`,
                    numberId: i
                },
                classes: "activity"
            }
        ));

    filteredNodes.sort((a, b) =>
        nodeDegrees[a.data.numberId] < nodeDegrees[b.data.numberId] ? -1 : 1);

    const elements: cytoscape.ElementDefinition[] = filteredNodes.concat(links);

    const style: cytoscape.Stylesheet[] = [
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
        'selector': '.activity',
        'style':
        {
            'shape': 'rectangle'
        }
    },
    {
        'selector': '.object_type',
        'style': {
        'shape': 'ellipse'
    }
    },
    {
        'selector': '.formula',
        'style': {
        'shape': 'roundrectangle'
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
            'loop-direction': '-90deg',
            'loop-sweep': '-25deg',
            // 'control-point-step-size': '100'
            // 'target-endpoint': 'outside-to-line',
            // 'source-endpoint': 'outside-to-line',
        }
    }];

    const layout = {
        name: 'breadthfirst',
        roots: filteredNodes.length > 0 ? [filteredNodes[0].data.id] : undefined,
        fit: true,
        nodeDimensionsIncludeLabels: true,
        spacingFactor: 0.7

        // elk: {
        //     'algorithm': 'mrtree',
        //     'elk.direction': 'DOWN',
        //     'spacing.portsSurrounding': 20,
        //     "spacing.nodeNodeBetweenLayers": 100
        // }
    }

    return <CytoscapeComponent
                elements={elements}
                stylesheet={style}
                layout={layout}
                style={ { width: '100%', height: '100%' } }
                wheelSensitivity={0.2}/>;
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