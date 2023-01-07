import React, {useMemo, useRef, useState} from 'react';
import '../../App.css';
import {ExploriNavbar} from "../../components/ExploriNavbar/ExploriNavbar";

import "./Home.css";
import {AsyncApiState, useAsyncAPI} from "../../hooks";
import {CytoDFMMethods, DirectlyFollowsMultigraph, FilteredCytoDFM} from '../../components/cytoscape-dfm/cytodfm';
import {faSnowflake} from "@fortawesome/free-regular-svg-icons";
import {faBrush, faShareFromSquare} from "@fortawesome/free-solid-svg-icons";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import {RootState} from "../../redux/store";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {connect} from "react-redux";
import {
    setGraphHorizontal,
    setHighlightedMode,
    setSelectedObjectTypes,
    setThreshold,
    setAlignmentMode,
    setLegendPosition,
} from "../../redux/UserSession/userSession.actions";
import {setDfmQueryState} from "../../redux/DFMQuery/dfmquery";
import {resetAlignmentQueryState} from "../../redux/AlignmentsQuery/alingmentsquery";
import {NavbarButton} from "../../components/ExploriNavbar/NavbarButton/NavbarButton";
import {NewObjectSelection} from "../../components/NewObjectSelection/NewObjectSelection";
import {
    NO_HIGHLIGHTING,
    EDGE_COUNT_HIGHLIGHTING,
    LOGARITHMIC_EDGE_COUNT_HIGHLIGHTING
} from "../../components/cytoscape-dfm/EdgeHighlighters";
import {NavbarDropdown} from "../../components/ExploriNavbar/NavbarDropdown/NavbarDropdown";
import {DropdownCheckbox} from "../../components/ExploriNavbar/NavbarDropdown/DropdownCheckbox/DropdownCheckbox";

enum HighlightingModeName {
    NoHighlighting = "none",
    CountBased = "edgeCounts",
    LogarithmicCount = "logarithmicEdgeCounts"
}

enum AlignmentModeName {
    NoAlignments = "none",
    Simple = "simple",
    Expansive = "expansive"
}

enum LegendPositionName {
    None = "none",
    TopLeft = "top-left",
    TopRight = "top-right",
    BottomLeft = "bottom-left",
    BottomRight = "bottom-right",

}

interface HomeProps {

}

const mapStateToProps = (state: RootState, props: HomeProps) => ({
    session: state.session,
    dfmQuery: state.dfmQuery,
});
const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, props: HomeProps) => ({
    setThreshold: async (threshold: number) => {
        dispatch(setThreshold(threshold));
    },
    setSelectedObjectTypes: async (selectedObjectTypes: string[]) => {
        dispatch(setSelectedObjectTypes(selectedObjectTypes))
    },
    setHighlightingMode: async (mode: HighlightingModeName) => {
        dispatch(setHighlightedMode(mode))
    },
    setGraphHorizontal: async (horizontal: boolean) => {
        dispatch(setGraphHorizontal(horizontal))
    },
    setAlignmentMode: async(mode: string) => {
        dispatch(setAlignmentMode(mode))
    },
    setLegendPosition: async(position: string) => {
        dispatch(setLegendPosition(position))
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
    const [infoboxEnabled, setInfoboxEnabled] = useState<boolean>(true);

    const dfm_query = useAsyncAPI<DirectlyFollowsMultigraph>("/pm/dfm", {ocel: selectedOcel},
        {state: props.dfmQuery, setState: props.setDfmQuery});
    const graphRef = useRef<CytoDFMMethods>();

    const availableObjectTypes: string[] = dfm_query.result ? Object.keys(dfm_query.result.subgraphs) : [];

    const highlightingModeInstance = useMemo(() => {
        switch (props.session.highlightingMode) {
            case HighlightingModeName.NoHighlighting:
                return NO_HIGHLIGHTING
            case HighlightingModeName.CountBased:
                return EDGE_COUNT_HIGHLIGHTING
            case HighlightingModeName.LogarithmicCount:
                return LOGARITHMIC_EDGE_COUNT_HIGHLIGHTING
            case null:
            default:
                return NO_HIGHLIGHTING
        }
    }, [props.session.highlightingMode]);

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
            <VizSettings
                selectedHighlightingMode={(props.session.highlightingMode as HighlightingModeName) || HighlightingModeName.NoHighlighting}
                setSelectedHighlightingMode={props.setHighlightingMode}
                graphHorizontal={props.session.graphHorizontal}
                setGraphHorizontal={props.setGraphHorizontal}
                selectedAlignmentMode={(props.session.alignmentMode as AlignmentModeName) || AlignmentModeName.NoAlignments}
                setAlignmentMode={props.setAlignmentMode}
                selectedLegendPosition={(props.session.legendPosition as LegendPositionName) || LegendPositionName.None}
                setLegendPosition={props.setLegendPosition}
                infoboxEnabled={infoboxEnabled}
                setInfoboxEnabled={(enabled) => setInfoboxEnabled(enabled)}
            />
            <NewObjectSelection
                availableObjectTypes={availableObjectTypes}
                selectedObjectTypes={props.session.selectedObjectTypes}
                setSelectedObjectTypes={props.setSelectedObjectTypes}
                alreadySelectedAllObjectTypesInitially={alreadySelectedAllObjectTypesInitially}
                selectAllObjectTypesInitially={true}/>
        </React.Fragment>);

    return (
        <React.Fragment>
            <div className="Home">
                <ExploriNavbar lowerRowSlot={navbarItems}/>
                <FilteredCytoDFM dfm={dfm_query.result}
                                 threshold={props.session.threshold / 100}
                                 selectedObjectTypes={props.session.selectedObjectTypes}
                                 positionsFrozen={frozen}
                                 highlightingMode={highlightingModeInstance}
                                 graphHorizontal={props.session.graphHorizontal}
                                 alignmentMode={props.session.alignmentMode}
                                 legendPosition={props.session.legendPosition}
                                 infoboxEnabled={infoboxEnabled}
                                 ref={graphRef}/>
                {!dfm_query.result && !dfm_query.failed && (
                    <Box sx={{
                        display: 'flex',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        'margin-right': '-50%',
                        transform: 'translate(-50%, -50%)'
                    }}>
                        <CircularProgress/>
                    </Box>
                )
                }
                {dfm_query.failed && (
                    <Alert severity="error" sx={{'z-index': 999, 'padding-bottom': 0, 'padding-top': 0}}>Task failed due
                        to server related reasons. (Received 200)</Alert>
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

type VizSettingsProps = {
    selectedHighlightingMode: HighlightingModeName,
    setSelectedHighlightingMode: ((mode: HighlightingModeName) => void) | ((mode: HighlightingModeName) => Promise<void>),

    graphHorizontal: boolean,
    setGraphHorizontal: ((mode: boolean) => void) | ((mode: boolean) => Promise<void>),
    selectedAlignmentMode: AlignmentModeName,
    setAlignmentMode: (mode: string) => void,
    selectedLegendPosition: LegendPositionName,
    setLegendPosition: (position: string) => void,
    infoboxEnabled: boolean,
    setInfoboxEnabled: (enabled: boolean) => void
}

const VizSettings = (props: VizSettingsProps) => {
    return (
        <NavbarDropdown buttonIcon={faBrush} buttonText="Settings">
            <div className="VizSettings-Label">Highlighting</div>
            <DropdownCheckbox
                selected={props.selectedHighlightingMode === HighlightingModeName.NoHighlighting}
                label="None"
                onClick={() => props.setSelectedHighlightingMode(HighlightingModeName.NoHighlighting)}/>
            <DropdownCheckbox
                selected={props.selectedHighlightingMode === HighlightingModeName.CountBased}
                label="Count"
                onClick={() => props.setSelectedHighlightingMode(HighlightingModeName.CountBased)}/>
            <DropdownCheckbox
                selected={props.selectedHighlightingMode === HighlightingModeName.LogarithmicCount}
                label="Logarithmic count"
                onClick={() => props.setSelectedHighlightingMode(HighlightingModeName.LogarithmicCount)}/>
            <div className="VizSettings-Label">Graph direction</div>
            <DropdownCheckbox
                selected={!props.graphHorizontal}
                label="Top to down"
                onClick={() => props.setGraphHorizontal(false)}/>
            <DropdownCheckbox
                selected={props.graphHorizontal}
                label="Left to right"
                onClick={() => props.setGraphHorizontal(true)}/>
            <div className="VizSettings-Label">Show alignments</div>
            <DropdownCheckbox
                selected={props.selectedAlignmentMode === AlignmentModeName.NoAlignments}
                label="None"
                onClick={() => props.setAlignmentMode(AlignmentModeName.NoAlignments)}/>
            <DropdownCheckbox
                selected={props.selectedAlignmentMode === AlignmentModeName.Simple}
                label="Simple"
                onClick={() => props.setAlignmentMode(AlignmentModeName.Simple)}/>
            <DropdownCheckbox
                selected={props.selectedAlignmentMode === AlignmentModeName.Expansive}
                label="Expansive"
                onClick={() => props.setAlignmentMode(AlignmentModeName.Expansive)}/>
            <div className="VizSettings-Label">Legend position</div>
            <DropdownCheckbox
                selected={props.selectedLegendPosition === LegendPositionName.None}
                label="None"
                onClick={() => props.setLegendPosition(LegendPositionName.None)}/>
            <DropdownCheckbox
                selected={props.selectedLegendPosition === LegendPositionName.TopLeft}
                label="Top left"
                onClick={() => props.setLegendPosition(LegendPositionName.TopLeft)}/>
            <DropdownCheckbox
                selected={props.selectedLegendPosition === LegendPositionName.TopRight}
                label="Top right"
                onClick={() => props.setLegendPosition(LegendPositionName.TopRight)}/>
            <DropdownCheckbox
                selected={props.selectedLegendPosition === LegendPositionName.BottomLeft}
                label="Bottom left"
                onClick={() => props.setLegendPosition(LegendPositionName.BottomLeft)}/>
            <DropdownCheckbox
                selected={props.selectedLegendPosition === LegendPositionName.BottomRight}
                label="Bottom right"
                onClick={() => props.setLegendPosition(LegendPositionName.BottomRight)}/>
            <div className="VizSettings-Label">Infobox</div>
            <DropdownCheckbox
                selected={props.infoboxEnabled}
                label={props.infoboxEnabled ? "Enabled" : "Disabled"}
                onClick={() => props.setInfoboxEnabled(!props.infoboxEnabled)}/>
        </NavbarDropdown>
    )
}
