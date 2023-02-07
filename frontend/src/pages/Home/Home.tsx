import React, {useMemo, useRef, useState} from 'react';
import '../../App.css';
import {ExploriNavbar} from "../../components/ExploriNavbar/ExploriNavbar";

import "./Home.css";
import {AsyncApiState, useAsyncAPI} from "../../hooks";
import {CytoDFMMethods, DirectlyFollowsMultigraph, FilteredCytoDFM} from '../../components/cytoscape-dfm/cytodfm';
import {faSnowflake} from "@fortawesome/free-regular-svg-icons";
import {faBrush, faShareFromSquare, faDiagramProject} from "@fortawesome/free-solid-svg-icons";
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
    setEdgeLabelMode,
} from "../../redux/UserSession/userSession.actions";
import {setDfmQueryState} from "../../redux/DFMQuery/dfmquery";
import {resetAlignmentQueryState} from "../../redux/AlignmentsQuery/alingmentsquery";
import {NavbarButton} from "../../components/ExploriNavbar/NavbarButton/NavbarButton";
import {NewObjectSelection} from "../../components/NewObjectSelection/NewObjectSelection";
import {
    NO_HIGHLIGHTING,
    PerformanceBasedHighlighting,
    EdgeHighlightingMode,
    CountBasedHighlighting,
    OutputClamper
} from "../../components/cytoscape-dfm/EdgeHighlighters";
import {NavbarDropdown} from "../../components/ExploriNavbar/NavbarDropdown/NavbarDropdown";
import {DropdownCheckbox} from "../../components/ExploriNavbar/NavbarDropdown/DropdownCheckbox/DropdownCheckbox";
import {resetPerformanceQueryState, setPerformanceQueryState} from "../../redux/PerformanceQuery/performancequery";
import {PerformanceMetrics} from "../../redux/PerformanceQuery/performancequery.types";
import {EdgeLabelMode} from "../../redux/UserSession/userSession.types";

enum HighlightingModeName {
    NoHighlighting = "none",
    Linear = "linear",
    Logarithmic = "logarithmic"
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
    performanceQuery: state.performanceQuery
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
    setEdgeLabelMode: async(mode: EdgeLabelMode) => {
        dispatch(setEdgeLabelMode(mode))
    },
    setDfmQuery: (state: AsyncApiState<DirectlyFollowsMultigraph>) => {
        dispatch(setDfmQueryState(state));
    },
    resetAlignmentsQuery: () => {
        dispatch(resetAlignmentQueryState())
    },
    setPerformanceQuery: (state: AsyncApiState<PerformanceMetrics>) => {
        dispatch(setPerformanceQueryState(state));
    },
    resetPerformanceQuery:() => {
        dispatch(resetPerformanceQueryState());
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
    const performanceQuery = useAsyncAPI<PerformanceMetrics>("/pm/ocel-performance", {
        process_ocel: props.session.ocel,
        metrics_ocel: props.session.ocel,
        threshold: props.session.threshold/100.0
    }, {
        state: props.performanceQuery,
        setState: props.setPerformanceQuery
    });
    const graphRef = useRef<CytoDFMMethods>();

    const availableObjectTypes: string[] = dfm_query.result ? Object.keys(dfm_query.result.subgraphs) : [];

    const highlightingModeInstance = useMemo(() => {
        if (props.session.highlightingMode === HighlightingModeName.Linear ||
            props.session.highlightingMode === HighlightingModeName.Logarithmic)
        {
            let transform = undefined;
            if (props.session.highlightingMode === HighlightingModeName.Logarithmic)
                transform = (count: number) => {
                    if (count > 0)
                        return Math.log2(count) / Math.log2(1.1)
                    return count
                }

            let mode: EdgeHighlightingMode;
            if (props.session.edgeLabelMode && props.session.edgeLabelMode.metric !== "count") {
                mode = new PerformanceBasedHighlighting(props.session.edgeLabelMode.metric,
                    props.session.edgeLabelMode.aggregate,
                    transform);
            }
            else
                mode = new CountBasedHighlighting(transform);

            return new OutputClamper(mode)
        }
        else
            return NO_HIGHLIGHTING
    }, [props.session.highlightingMode, props.session.edgeLabelMode]);

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
                selectedEdgeLabel={props.session.edgeLabelMode || { metric: "count", aggregate: "sum"}}
                setEdgeLabelMode={props.setEdgeLabelMode}
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
                                 performanceMetrics={performanceQuery.result ? performanceQuery.result : performanceQuery.preliminary}
                                 threshold={props.session.threshold / 100}
                                 selectedObjectTypes={props.session.selectedObjectTypes}
                                 positionsFrozen={frozen}
                                 highlightingMode={highlightingModeInstance}
                                 graphHorizontal={props.session.graphHorizontal}
                                 alignmentMode={props.session.alignmentMode}
                                 legendPosition={props.session.legendPosition}
                                 edgeLabelMode={props.session.edgeLabelMode}
                                 infoboxEnabled={infoboxEnabled}
                                 ref={graphRef}/>
                {!dfm_query.result && !dfm_query.failed && (
                    <Box sx={{
                        display: 'flex',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginRight: '-50%',
                        transform: 'translate(-50%, -50%)'
                    }}>
                        <CircularProgress/>
                    </Box>
                )}
                {!performanceQuery.result && performanceQuery.preliminary && (
                    <Box sx={{
                        display: 'flex',
                        position: 'absolute',
                        top: '7rem',
                        right: '2rem'
                    }}>
                        <CircularProgress/>
                    </Box>
                )}
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
                        props.resetPerformanceQuery();
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
    selectedEdgeLabel: EdgeLabelMode,
    setEdgeLabelMode: (mode: EdgeLabelMode) => void,
    infoboxEnabled: boolean,
    setInfoboxEnabled: (enabled: boolean) => void
}

const VizSettings = (props: VizSettingsProps) => {
    function setMetric(metric: "count" | "pooling_time" | "waiting_time") {
        if (metric === "count")
            props.setEdgeLabelMode({metric: "count", aggregate: props.selectedEdgeLabel.aggregate});
        else if (props.selectedEdgeLabel.metric === "count" && props.selectedEdgeLabel.aggregate === "sum")
            props.setEdgeLabelMode({metric, aggregate: "mean"})
        else
            props.setEdgeLabelMode({metric, aggregate: props.selectedEdgeLabel.aggregate})
    }

    function setAggregate(aggregate: "min" | "median" | "mean" | "max" | "stdev" | "sum") {
        props.setEdgeLabelMode({
            metric: props.selectedEdgeLabel.metric,
            aggregate
        })
    }

    return (
        <React.Fragment>
            <NavbarDropdown buttonIcon={faDiagramProject} buttonText="Information">
                <div className="VizSettings-Label" title={"Select mode for showing alignments in the graph."}>Show alignments</div>
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
                    label="Extended"
                    onClick={() => props.setAlignmentMode(AlignmentModeName.Expansive)}/>
                <div className="VizSettings-Label" title={"Select mode for showing performance metrics on the edges."}>Edge metric</div>
                <DropdownCheckbox
                    selected={props.selectedEdgeLabel.metric === "count"}
                    label="Counts (Default)"
                    onClick={() => setMetric("count")}/>
                <DropdownCheckbox
                    selected={props.selectedEdgeLabel.metric === "pooling_time"}
                    label="Edge pooling time"
                    onClick={() => setMetric("pooling_time")}/>
                <DropdownCheckbox
                    selected={props.selectedEdgeLabel.metric === "waiting_time"}
                    label="Edge waiting time"
                    onClick={() => setMetric("waiting_time")}/>

                {
                    (props.selectedEdgeLabel.metric !== "count") && (
                        <React.Fragment>
                            <div className="VizSettings-Label" title={"Select the aggregation of the label metrics"}>Metric aggregation</div>
                            <DropdownCheckbox
                                selected={props.selectedEdgeLabel.aggregate === "min"}
                                label="Minimum"
                                onClick={() => setAggregate("min")}/>
                            <DropdownCheckbox
                                selected={props.selectedEdgeLabel.aggregate === "mean"}
                                label="Mean"
                                onClick={() => setAggregate("mean")}/>
                            <DropdownCheckbox
                                selected={props.selectedEdgeLabel.aggregate === "median"}
                                label="Median"
                                onClick={() => setAggregate("median")}/>
                            <DropdownCheckbox
                                selected={props.selectedEdgeLabel.aggregate === "max"}
                                label="Max"
                                onClick={() => setAggregate("max")}/>
                            <DropdownCheckbox
                                selected={props.selectedEdgeLabel.aggregate === "sum"}
                                label="Total time"
                                onClick={() => setAggregate("sum")}/>
                        </React.Fragment>
                    )
                }

                <div className="VizSettings-Label" title={"Select highlighting mode for the edges."}>Highlighting</div>
                <DropdownCheckbox
                    selected={props.selectedHighlightingMode === HighlightingModeName.NoHighlighting}
                    label="None"
                    onClick={() => props.setSelectedHighlightingMode(HighlightingModeName.NoHighlighting)}/>
                <DropdownCheckbox
                    selected={props.selectedHighlightingMode === HighlightingModeName.Linear}
                    label="Linear"
                    onClick={() => props.setSelectedHighlightingMode(HighlightingModeName.Linear)}/>
                <DropdownCheckbox
                    selected={props.selectedHighlightingMode === HighlightingModeName.Logarithmic}
                    label="Logarithmic"
                    onClick={() => props.setSelectedHighlightingMode(HighlightingModeName.Logarithmic)}/>
            </NavbarDropdown>
            <NavbarDropdown buttonIcon={faBrush} buttonText="Settings">
                <div className="VizSettings-Label" title={"Select the direction in which the graph is rendered."}>Graph direction</div>
                <DropdownCheckbox
                    selected={!props.graphHorizontal}
                    label="Top to down"
                    onClick={() => props.setGraphHorizontal(false)}/>
                <DropdownCheckbox
                    selected={props.graphHorizontal}
                    label="Left to right"
                    onClick={() => props.setGraphHorizontal(true)}/>
                <div className="VizSettings-Label" title={"Select the position of the object type legend."}>Legend position</div>
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
                <div className="VizSettings-Label" title={"Toggle for the infobox shown when clicking on edges or nodes."}>Infobox</div>
                <DropdownCheckbox
                    selected={props.infoboxEnabled}
                    label={props.infoboxEnabled ? "Enabled" : "Disabled"}
                    onClick={() => props.setInfoboxEnabled(!props.infoboxEnabled)}/>
            </NavbarDropdown>
        </React.Fragment>
    )
}
