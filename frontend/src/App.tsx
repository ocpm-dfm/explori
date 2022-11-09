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

    const dfm: DirectlyFollowsMultigraph = {'nodes': [{'label': 'Issue Goods Receipt', 'threshold': 0.0},
            {'label': 'Receive Invoice', 'threshold': 0.4263764404609475},
            {'label': 'Clear Invoice', 'threshold': 0.4263764404609475},
            {'label': 'Plan Goods Issue', 'threshold': 0.10243277848911651},
            {'label': 'Verify Material', 'threshold': 0.10243277848911651},
            {'label': 'Goods Issue', 'threshold': 0.10243277848911651},
            {'label': 'Create Purchase Order', 'threshold': 0.0},
            {'label': 'Receive Goods', 'threshold': 0.0},
            {'label': 'Create Purchase Requisition', 'threshold': 0.0}],
        'subgraphs': {'GDSRCPT': [{'source': 0,
                'target': 2,
                'threshold': 0.795134443021767},
                {'source': 7, 'target': 0, 'threshold': 0.0}],
            'INVOICE': [{'source': 1,
                'target': 2,
                'threshold': 0.4263764404609475}],
            'MATERIAL': [{'source': 0,
                'target': 3,
                'threshold': 0.58898847631242},
                {'source': 3,
                    'target': 4,
                    'threshold': 0.58898847631242},
                {'source': 4,
                    'target': 5,
                    'threshold': 0.58898847631242},
                {'source': 0,
                    'target': 4,
                    'threshold': 0.10243277848911651},
                {'source': 4,
                    'target': 3,
                    'threshold': 0.10243277848911651},
                {'source': 3,
                    'target': 5,
                    'threshold': 0.10243277848911651},
                {'source': 6,
                    'target': 7,
                    'threshold': 0.10243277848911651},
                {'source': 8, 'target': 6, 'threshold': 0.0},
                {'source': 7, 'target': 0, 'threshold': 0.0}],
            'PURCHORD': [{'source': 0,
                'target': 1,
                'threshold': 0.8975672215108835},
                {'source': 1,
                    'target': 2,
                    'threshold': 0.4263764404609475},
                {'source': 6,
                    'target': 7,
                    'threshold': 0.10243277848911651},
                {'source': 7, 'target': 0, 'threshold': 0.0}],
            'PURCHREQ': [{'source': 8, 'target': 6, 'threshold': 0.0}]}};


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
