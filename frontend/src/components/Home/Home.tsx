import React, {useRef, useState} from 'react';
import '../../App.css';
import { ObjectSelection } from "../ObjectSelection/ObjectSelection";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";

import "./Home.css";
import {useAsyncAPI} from "../../api";
import {UserSessionState} from "../UserSession/UserSession";
import {CytoDFMMethods, DirectlyFollowsMultigraph, FilteredCytoDFM} from '../cytoscape-dfm/cytodfm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faSnowflake} from "@fortawesome/free-regular-svg-icons";
import {faShareFromSquare} from "@fortawesome/free-solid-svg-icons";
import {RootState} from "../../redux/store";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {connect} from "react-redux";
import {setThreshold} from "../../redux/UserSession/userSession.actions";

interface HomeProps {
    userSessionState: UserSessionState,
    stateChangeCallback: any
}

const mapStateToProps = (state: RootState, props: HomeProps) => ({
    threshold: state.session.threshold,
    ocel: state.session.ocel
});
const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, props: HomeProps) => ({
    setThreshold: async (threshold: number) => {
        dispatch(setThreshold(threshold));
    }
});

type StateProps = ReturnType<typeof mapStateToProps>
type DispatchProps = ReturnType<typeof mapDispatchToProps>
type Props = HomeProps & StateProps & DispatchProps


export const Home = connect<StateProps, DispatchProps, HomeProps, RootState>(mapStateToProps, mapDispatchToProps)((props: Props) => {
    console.log("Rerendering home");

    let selectedObjectTypes = props.userSessionState.selectedObjectTypes;
    const selectedOcel = props.userSessionState.ocel;
    const alreadySelectedAllObjectTypesInitially = props.userSessionState.alreadySelectedAllObjectTypesInitially;
    const stateChangeCallback = props.stateChangeCallback;

    const [frozen, setFrozen] = useState<boolean>(false);

    const dfm_query = useAsyncAPI<DirectlyFollowsMultigraph>("/pm/dfm", {ocel: selectedOcel});
    const graphRef = useRef<CytoDFMMethods>();

    const availableObjectTypes: string[] = dfm_query.result ? Object.keys(dfm_query.result.subgraphs) : [];
    selectedObjectTypes = selectedObjectTypes ? selectedObjectTypes : [];

    const navbarItems = (
        <React.Fragment>
            <button className="Home-NavbarButton Home-NavbarButton--icon"
                    onClick={() => graphRef.current?.exportAsJpg()} title="Export the graph as image.">
                <FontAwesomeIcon icon={faShareFromSquare} />
            </button>
            <button className={`Home-NavbarButton Home-NavbarButton--icon ${frozen ? 'Home-NavbarButton--active' : ''}`}
                    onClick={() => setFrozen(!frozen)}
                    title="Freezes all node positions so that they are not changed when the threshold is changed.">
                <FontAwesomeIcon icon={faSnowflake} />
            </button>
            <ObjectSelection
                availableObjectTypes={availableObjectTypes}
                selectedObjectTypes={selectedObjectTypes}
                updateCallback={stateChangeCallback}
                alreadySelectedAllObjectTypesInitially={alreadySelectedAllObjectTypesInitially}
                selectAllObjectTypesInitially={true} />
        </React.Fragment>);

    return (
        <React.Fragment>
            <div className="Home">
                <ExploriNavbar lowerRowSlot={navbarItems} />
                <FilteredCytoDFM dfm={dfm_query.result}
                                 threshold={props.threshold / 100}
                                 selectedObjectTypes={selectedObjectTypes}
                                 positionsFrozen={frozen}
                                 ref={graphRef} />
                <div className="Home-DetailSlider">
                    <div className="Home-DetailSlider-Label">
                        Less detail
                    </div>
                    <input type="range" min="0" max="100"
                        className="Home-DetailSlider-Slider"
                        value={props.threshold} onInput={(e) => {
                            const newThreshold = (e.target as HTMLInputElement).value as unknown as number;
                            // stateChangeCallback({
                            //     filteringThreshold: newThreshold
                            // });
                            props.setThreshold(newThreshold);
                        }}
                    />
                    <div className="Home-DetailSlider-Label">
                        More detail
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
});
