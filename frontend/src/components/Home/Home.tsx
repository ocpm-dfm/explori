import React, {useState} from 'react';
import '../../App.css';
import {DirectlyFollowsMultigraph, FilteredDFM} from "../dfm/dfm";
import { ObjectSelection } from "../ObjectSelection/ObjectSelection";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";

import "./Home.css";
import {useAsyncAPI} from "../../api";


export const Home = (props: { filteringThreshold: number, stateChangeCallback: any}) => {
    const filteringThreshold = props.filteringThreshold;
    const stateChangeCallback = props.stateChangeCallback;

    const dfm_query = useAsyncAPI<DirectlyFollowsMultigraph>("/pm/dfm", {ocel: "uploaded/p2p-normal.jsonocel"});


    const objectSelection = <ObjectSelection />

    return (
        <React.Fragment>
            <div className="Home">
                <ExploriNavbar lowerRowSlot={objectSelection} />
                <FilteredDFM dfm={dfm_query.result} threshold={filteringThreshold / 100} />
                <div className="Home-DetailSlider">
                    <div className="Home-DetailSlider-Label">
                        Less detail
                    </div>
                    <input type="range" min="0" max="100"
                        className="Home-DetailSlider-Slider"
                        value={filteringThreshold} onInput={(e) => {
                            stateChangeCallback({
                                filteringThreshold: (e.target as HTMLInputElement).value
                            })
                        }}
                    />
                    <div className="Home-DetailSlider-Label">
                        More detail
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}
