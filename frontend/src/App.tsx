import React, {useState} from 'react';
import './App.css';
import {DirectlyFollowsMultigraph, FilteredDFM} from "./components/dfm/dfm";

function App() {
    const [state, setState] = useState({
        threshold: 100
    })

    // const dfm: DirectlyFollowsMultigraph = {
    //     nodes: [
    //         {
    //             label: "First activity",
    //             threshold: 0
    //         },
    //         {
    //             label: "Optional activity, only for obj-t-1",
    //             threshold: 0.5
    //         },
    //         {
    //             label: "Third activity",
    //             threshold: 0
    //         }
    //     ],
    //     subgraphs: {
    //         "obj-t-1": [
    //             {
    //                 source: 0,
    //                 target: 2,
    //                 threshold: 0
    //             },
    //             {
    //                 source: 0,
    //                 target: 1,
    //                 threshold: 0.5,
    //             },
    //             {
    //                 source: 1,
    //                 target: 2,
    //                 threshold: 0.5
    //             }
    //         ],
    //         "obj-t-2": [
    //             {
    //                 source: 0,
    //                 target: 2,
    //                 threshold: 0
    //             }
    //         ]
    //     }
    // };

    const dfm: DirectlyFollowsMultigraph = {'nodes': [{'label': 'Create Purchase Order', 'threshold': 0.0},
            {'label': 'Receive Goods', 'threshold': 0.0},
            {'label': 'Issue Goods Receipt', 'threshold': 0.0},
            {'label': 'Receive Invoice', 'threshold': 0.5300896286811779},
            {'label': 'Clear Invoice', 'threshold': 0.5300896286811779},
            {'label': 'Create Purchase Requisition', 'threshold': 0.0},
            {'label': 'Plan Goods Issue', 'threshold': 0.0},
            {'label': 'Verify Material', 'threshold': 0.0},
            {'label': 'Goods Issue', 'threshold': 0.0}],
        'subgraphs': {'GDSRCPT': [{'source': 1,
                'target': 2,
                'threshold': 0.6927016645326505},
                {'source': 2,
                    'target': 4,
                    'threshold': 0.6927016645326505}],
            'INVOICE': [{'source': 3,
                'target': 4,
                'threshold': 0.5300896286811779}],
            'MATERIAL': [{'source': 2,
                'target': 6,
                'threshold': 0.323943661971831},
                {'source': 6,
                    'target': 7,
                    'threshold': 0.323943661971831},
                {'source': 7,
                    'target': 8,
                    'threshold': 0.323943661971831},
                {'source': 2, 'target': 7, 'threshold': 0.0},
                {'source': 7, 'target': 6, 'threshold': 0.0},
                {'source': 6, 'target': 8, 'threshold': 0.0},
                {'source': 5, 'target': 0, 'threshold': 0.0},
                {'source': 0, 'target': 1, 'threshold': 0.0},
                {'source': 1, 'target': 2, 'threshold': 0.0}],
            'PURCHORD': [{'source': 0,
                'target': 1,
                'threshold': 0.8975672215108835},
                {'source': 1,
                    'target': 2,
                    'threshold': 0.8975672215108835},
                {'source': 2,
                    'target': 3,
                    'threshold': 0.8975672215108835},
                {'source': 3,
                    'target': 4,
                    'threshold': 0.8975672215108835}],
            'PURCHREQ': [{'source': 5,
                'target': 0,
                'threshold': 0.795134443021767}]}};


    return (
        <div className="App">
            <FilteredDFM dfm={dfm} threshold={state.threshold / 100} />
            <div className="App-DetailSlider">
                <div className="App-DetailSlider-Label">
                    Less detail
                </div>
                <input type="range" min="0" max="100"
                       className="App-DetailSlider-Slider"
                       value={state.threshold} onInput={(e) => {
                    setState((old) => {
                        return Object.assign({}, old, {threshold: (e.target as HTMLInputElement).value})
                    })
                }}/>
                <div className="App-DetailSlider-Label">
                    More detail
                </div>
            </div>

        </div>
    );
}

export default App;
