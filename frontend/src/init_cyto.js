import cytoscape from 'cytoscape';
import elk from 'cytoscape-elk';
import dagre from 'cytoscape-dagre';

// This had to be in JavaScript because you cannot import these modules from TypeScript.
// Obviously, the JavaScript ecosystem needs another packaging / bundling solution to address this issue :)
export function init_cyto() {
    cytoscape.use(elk);
    cytoscape.use(dagre);
}