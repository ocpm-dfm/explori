import cytoscape from 'cytoscape';
import elk from 'cytoscape-elk';


export function init_cyto() {
    cytoscape.use(elk);
}