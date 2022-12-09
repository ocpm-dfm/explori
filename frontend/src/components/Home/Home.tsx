import React from 'react';
import '../../App.css';
import {DirectlyFollowsMultigraph, FilteredDFM} from "../dfm/dfm";
import { ObjectSelection } from "../ObjectSelection/ObjectSelection";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";

import "./Home.css";
import {useAsyncAPI} from "../../api";
import {UserSessionState} from "../UserSession/UserSession";
import { FilteredCytoDFM } from '../cytoscape-dfm/cytodfm';


export const Home = (props: { userSessionState: UserSessionState, stateChangeCallback: any}) => {
    const filteringThreshold = props.userSessionState.filteringThreshold;
    let selectedObjectTypes = props.userSessionState.selectedObjectTypes;
    const selectedOcel = props.userSessionState.ocel;
    const alreadySelectedAllObjectTypesInitially = props.userSessionState.alreadySelectedAllObjectTypesInitially;
    const stateChangeCallback = props.stateChangeCallback;

    const dfm_query = useAsyncAPI<DirectlyFollowsMultigraph>("/pm/dfm", {ocel: selectedOcel});

    const availableObjectTypes: string[] = dfm_query.result ? Object.keys(dfm_query.result.subgraphs) : [];
    selectedObjectTypes = selectedObjectTypes ? selectedObjectTypes : [];
    const objectTypeSelection = <ObjectSelection
        availableObjectTypes={availableObjectTypes}
        selectedObjectTypes={selectedObjectTypes}
        updateCallback={stateChangeCallback}
        alreadySelectedAllObjectTypesInitially={alreadySelectedAllObjectTypesInitially}
        selectAllObjectTypesInitially={true}
    />

    return (
        <React.Fragment>
            <div className="Home">
                <ExploriNavbar lowerRowSlot={objectTypeSelection} />
                <FilteredCytoDFM dfm={dfm_query.result} threshold={filteringThreshold / 100} selectedObjectTypes={selectedObjectTypes} />
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
