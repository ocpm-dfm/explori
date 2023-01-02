import React, {useRef, useState} from 'react';
import '../../App.css';
import {ExploriNavbar} from "../../components/ExploriNavbar/ExploriNavbar";

import "./Home.css";
import {AsyncApiState, useAsyncAPI} from "../../hooks";
import {CytoDFMMethods, DirectlyFollowsMultigraph, FilteredCytoDFM} from '../../components/cytoscape-dfm/cytodfm';
import {faSnowflake} from "@fortawesome/free-regular-svg-icons";
import {faShareFromSquare} from "@fortawesome/free-solid-svg-icons";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import {RootState} from "../../redux/store";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {connect} from "react-redux";
import {setSelectedObjectTypes, setThreshold} from "../../redux/UserSession/userSession.actions";
import {setDfmQueryState} from "../../redux/DFMQuery/dfmquery";
import {resetAlignmentQueryState} from "../../redux/AlignmentsQuery/alingmentsquery";
import {NavbarButton} from "../../components/ExploriNavbar/NavbarButton/NavbarButton";
import {NewObjectSelection} from "../../components/NewObjectSelection/NewObjectSelection";

interface HomeProps {

}

const mapStateToProps = (state: RootState, props: HomeProps) => ({
    session: state.session,
    dfmQuery: state.dfmQuery
});
const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, props: HomeProps) => ({
    setThreshold: async (threshold: number) => {
        dispatch(setThreshold(threshold));
    },
    setSelectedObjectTypes: async (selectedObjectTypes: string[]) => {
        dispatch(setSelectedObjectTypes(selectedObjectTypes))
    },
    setDfmQuery: (state: AsyncApiState<DirectlyFollowsMultigraph>) => {
        dispatch(setDfmQueryState(state));
    },
    resetAlignmentsQuery: () => {
        dispatch(resetAlignmentQueryState())
    }
});

type StateProps = ReturnType<typeof mapStateToProps>
type DispatchProps = ReturnType<typeof mapDispatchToProps>
type Props = HomeProps & StateProps & DispatchProps


export const Home = connect<StateProps, DispatchProps, HomeProps, RootState>(mapStateToProps, mapDispatchToProps)((props: Props) => {

    const selectedOcel = props.session.ocel;
    const alreadySelectedAllObjectTypesInitially = props.session.alreadySelectedAllObjectTypesInitially;

    const [frozen, setFrozen] = useState<boolean>(false);

    const dfm_query = useAsyncAPI<DirectlyFollowsMultigraph>("/pm/dfm", {ocel: selectedOcel},
        {state: props.dfmQuery, setState: props.setDfmQuery});
    const graphRef = useRef<CytoDFMMethods>();

    const availableObjectTypes: string[] = dfm_query.result ? Object.keys(dfm_query.result.subgraphs) : [];

    const navbarItems = (
        <React.Fragment>
            <NavbarButton icon={faShareFromSquare}
                          onClick={() => graphRef.current?.exportAsJpg()}
                          title="Export the graph as JPG.">
                Export
            </NavbarButton>
            <NavbarButton icon={faSnowflake} active={frozen}
                          onClick={() => setFrozen(!frozen)}
                          title="Freeze or unfreeze the node positions.">
                Freeze
            </NavbarButton>
            <NewObjectSelection
                availableObjectTypes={availableObjectTypes}
                selectedObjectTypes={props.session.selectedObjectTypes}
                setSelectedObjectTypes={props.setSelectedObjectTypes}
                alreadySelectedAllObjectTypesInitially={alreadySelectedAllObjectTypesInitially}
                selectAllObjectTypesInitially={true} />
        </React.Fragment>);

    return (
        <React.Fragment>
            <div className="Home">
                <ExploriNavbar lowerRowSlot={navbarItems} />
                <FilteredCytoDFM dfm={dfm_query.result}
                                 threshold={props.session.threshold / 100}
                                 selectedObjectTypes={props.session.selectedObjectTypes}
                                 positionsFrozen={frozen}
                                 ref={graphRef} />
                {!dfm_query.result && !dfm_query.failed && (
                    <Box sx={{
                        display: 'flex',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        'margin-right': '-50%',
                        transform: 'translate(-50%, -50%)'
                    }}>
                        <CircularProgress />
                    </Box>
                )
                }
                {dfm_query.failed && (
                    <Alert severity="error" sx={{'z-index': 999, 'padding-bottom': 0, 'padding-top': 0}}>Task failed due to server related reasons. (Received 200)</Alert>
                )}
                <div className="Home-DetailSlider">
                    <div className="Home-DetailSlider-Label">
                        Less detail
                    </div>
                    <input type="range" min="0" max="100"
                        className="Home-DetailSlider-Slider"
                        value={props.session.threshold} onInput={(e) => {
                            const newThreshold = Number.parseInt((e.target as HTMLInputElement).value);
                            // stateChangeCallback({
                            //     filteringThreshold: newThreshold
                            // });
                            props.resetAlignmentsQuery();
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
