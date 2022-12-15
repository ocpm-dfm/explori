import cytoscape from 'cytoscape';
import elk from 'cytoscape-elk';
import dagre from 'cytoscape-dagre';


export function init_cyto() {
    cytoscape.use(elk);
    cytoscape.use(dagre);
}