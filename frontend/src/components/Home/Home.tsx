import React, {useState} from 'react';
import '../../App.css';
import {DirectlyFollowsMultigraph, FilteredDFM} from "../dfm/dfm";
import { ObjectSelection } from "../ObjectSelection/ObjectSelection";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";

import "./Home.css";
import {useAsyncAPI} from "../../api";
import {selectedObjectTypesUpdateCallback} from "../ObjectSelection/ObjectSelection";
import {MultiValue} from "react-select";

type HomeState = {
    threshold: number,
    selectedObjectTypes: string[],
}

function Home() {
    const [state, setState] = useState<HomeState>({
        threshold: 100,
        selectedObjectTypes: [],
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

    const updateCallback: selectedObjectTypesUpdateCallback = function(selection: string[]) {
        setState((old) => Object.assign({}, old, {
            selectedObjectTypes: selection,
        }));
    }

    const dfm_query = useAsyncAPI<DirectlyFollowsMultigraph>("/pm/dfm", {ocel: "uploaded/p2p-normal.jsonocel"});

    const objectTypes: string[] = dfm_query.result ? Object.keys(dfm_query.result.subgraphs) : [];
    const objectSelection = <ObjectSelection objectTypes={objectTypes} updateCallback={updateCallback} selectAllObjectTypesInitially={true} />

    return (
        <React.Fragment>
            <div className="Home">
                <ExploriNavbar lowerRowSlot={objectSelection} />
                <FilteredDFM dfm={dfm_query.result} threshold={state.threshold / 100} />
                <div className="Home-DetailSlider">
                    <div className="Home-DetailSlider-Label">
                        Less detail
                    </div>
                    <input type="range" min="0" max="100"
                        className="Home-DetailSlider-Slider"
                        value={state.threshold} onInput={(e) => {
                        setState((old) => {
                            return Object.assign({}, old, {threshold: (e.target as HTMLInputElement).value})
                        })
                    }}/>
                    <div className="Home-DetailSlider-Label">
                        More detail
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}

export default Home;
