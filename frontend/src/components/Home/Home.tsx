import React, {useState} from 'react';
import '../../App.css';
import {DirectlyFollowsMultigraph, FilteredDFM} from "../dfm/dfm";
import { ObjectSelection } from "../ObjectSelection/ObjectSelection";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";
import { useLocation } from 'react-router-dom';

import "./Home.css";
import {useAsyncAPI} from "../../api";
import {UserSessionState} from "../UserSession/UserSession";


export const Home = (props: { userSessionState: UserSessionState, stateChangeCallback: any}) => {
    const location = useLocation();

    const filteringThreshold = props.userSessionState.filteringThreshold;
    const selectedObjectTypes = props.userSessionState.selectedObjectTypes;
    const selectedOcel = props.userSessionState.ocel;
    const stateChangeCallback = props.stateChangeCallback;

    const dfm_query = useAsyncAPI<DirectlyFollowsMultigraph>("/pm/dfm", {ocel: selectedOcel});

    const objectTypes: string[] = dfm_query.result ? Object.keys(dfm_query.result.subgraphs) : [];
    const objectSelection = <ObjectSelection objectTypes={objectTypes} updateCallback={stateChangeCallback} selectAllObjectTypesInitially={true} />

    return (
        <React.Fragment>
            <div className="Home">
                <ExploriNavbar lowerRowSlot={objectSelection} />
                <FilteredDFM dfm={dfm_query.result} threshold={filteringThreshold / 100} selectedObjectTypes={selectedObjectTypes} />
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
