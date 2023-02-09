import React from 'react';
import  "../../components/DefaultLayout/DefaultLayout.css";
import {AsyncApiState, useAsyncAPI} from "../../hooks";
import {ExploriNavbar} from "../../components/ExploriNavbar/ExploriNavbar";
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css';
import "@inovua/reactdatagrid-community/theme/blue-light.css";
import "@inovua/reactdatagrid-community/base.css";
import "@inovua/reactdatagrid-community/index.css";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import {RootState} from "../../redux/store";
import {connect} from "react-redux";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {setAlignmentQueryState} from "../../redux/AlignmentsQuery/alingmentsquery";

import './Alignments.css';
import {getObjectTypeColor} from "../../utils";
import {TraceAlignment, TraceAlignments, AlignElement} from "../../redux/AlignmentsQuery/alignmentsquery.types";
import { AlignmentTable } from '../../components/AlignmentsTable/AlignmentsTable';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faShareFromSquare} from "@fortawesome/free-solid-svg-icons";
import {DirectlyFollowsMultigraph} from "../../components/cytoscape-dfm/cytodfm";
import {setDfmQueryState} from "../../redux/DFMQuery/dfmquery";
import {NewObjectSelection} from "../../components/NewObjectSelection/NewObjectSelection";
import {setSelectedObjectTypes} from "../../redux/UserSession/userSession.actions";

// Code from: https://reactdatagrid.io/docs/miscellaneous#csv-export-+-custom-search-box
export const downloadBlob = (blob: any, fileName = 'alignments-data.csv') => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.position = 'absolute';
    link.style.visibility = 'hidden';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
};

type AlignmentProps = {
}

const mapStateToProps = (state: RootState, _: AlignmentProps) => ({
    modelOcel: state.session.ocel,
    threshold: state.session.threshold,
    selectedObjectTypes: state.session.selectedObjectTypes,
    alreadySelectedAllObjectTypesInitially: state.session.alreadySelectedAllObjectTypesInitially,
    dfmQuery: state.dfmQuery,
    queryState: state.alignmentsQuery
});

const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, _: AlignmentProps) => ({
    setQueryState: (state: AsyncApiState<TraceAlignments>) => {
        dispatch(setAlignmentQueryState(state));
    },
    setDfmQuery: (state: AsyncApiState<DirectlyFollowsMultigraph>) => {
        dispatch(setDfmQueryState(state));
    },
    setSelectedObjectTypes: async (selectedObjectTypes: string[]) => {
        dispatch(setSelectedObjectTypes(selectedObjectTypes))
    },
});

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ReturnType<typeof mapDispatchToProps>;
type Props = AlignmentProps & StateProps & DispatchProps;

export const Alignments = connect<StateProps, DispatchProps, AlignmentProps, RootState>(mapStateToProps, mapDispatchToProps)((props: Props) => {
    const modelOcel = props.modelOcel;
    const conformanceOcel = props.modelOcel;
    const threshold = props.threshold;
    const selectedObjectTypes = props.selectedObjectTypes;
    const alreadySelectedAllObjectTypesInitially = props.alreadySelectedAllObjectTypesInitially;

    const dfm_query = useAsyncAPI<DirectlyFollowsMultigraph>(
        "/pm/dfm",
        {
            ocel: modelOcel
        },
        {
            state: props.dfmQuery,
            setState: props.setDfmQuery
        });

    const alignmentsQuery = useAsyncAPI<TraceAlignments>("/pm/alignments", {
        process_ocel: modelOcel,
        conformance_ocel: conformanceOcel,
        threshold: threshold/100.0,
    }, {
        state: props.queryState,
        setState: props.setQueryState
    });

    let object_type_alignments: {[key:string]: TraceAlignment[]} = {}

    const alignmentData = alignmentsQuery.preliminary ? alignmentsQuery.preliminary : alignmentsQuery.result;
    if (alignmentData) {
        try {
            alignmentData.forEach((traceWithAlignments : any) => {
                Object.keys(traceWithAlignments).forEach((objectType) => {
                    const alignment = traceWithAlignments[objectType];
                    if (alignment) {
                        if (!object_type_alignments[objectType])
                            object_type_alignments[objectType] = [];
                        // Need to check if alignments were not cut before already
                        if (alignment['log_alignment'][0].activity === "|EXPLORI_START|")
                            alignment['log_alignment'].shift()
                        if (alignment['log_alignment'][alignment['log_alignment'].length-1].activity === "|EXPLORI_END|")
                            alignment['log_alignment'].pop()
                        if (alignment['model_alignment'][0].activity === "|EXPLORI_START|")
                            alignment['model_alignment'].shift()
                        if (alignment['model_alignment'][alignment['model_alignment'].length-1].activity === "|EXPLORI_END|")
                            alignment['model_alignment'].pop()
                        object_type_alignments[objectType].push(alignment);
                    }
                })
            });

            //console.log(object_type_alignments['MATERIAL']);
        }
        catch (e) {
            console.error(e);
            //console.log(alignmentData)
        }
    }

    const availableObjectTypes: string[] = dfm_query.result ? Object.keys(dfm_query.result.subgraphs) : [];
    const totalMaterialCount = availableObjectTypes.length;

    const exportJSON = (objectType: string) => {
        const json = JSON.stringify(object_type_alignments[objectType], null, 4);
        const blob = new Blob([json],{type:'application/json'})

        downloadBlob(blob, "alignments-data-" + objectType + ".json");
    };

    const navbarItems = (
        <React.Fragment>
            <NewObjectSelection
                availableObjectTypes={availableObjectTypes}
                selectedObjectTypes={selectedObjectTypes}
                setSelectedObjectTypes={props.setSelectedObjectTypes}
                alreadySelectedAllObjectTypesInitially={alreadySelectedAllObjectTypesInitially}
                selectAllObjectTypesInitially={true}/>
        </React.Fragment>
    );

    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar lowerRowSlot={navbarItems}/>
            <div style={{position: "relative", minHeight: "50vh"}}>
                {!alignmentsQuery.result && !alignmentsQuery.preliminary && (
                    <Box sx={{
                        display: 'flex',
                        position: 'absolute',
                        bottom: '0%',
                        left: '50%',
                        marginRight: '-50%',
                        transform: 'translate(-50%, -50%)'
                    }}>
                        <CircularProgress />
                    </Box>
                )}
                {Object.keys(object_type_alignments).filter((objectType) => selectedObjectTypes.includes(objectType)).map((objectType) => (
                    <div className="DefaultLayout-Content Alignments-Card" key={`alignments=${objectType}`}>
                        <div className="Alignments-Card-Title-Container">
                            <h2 className="Alignments-Card-Title">
                                <div className="Alignments-Card-Title-Circle" style={{backgroundColor: getObjectTypeColor(totalMaterialCount, availableObjectTypes.indexOf(objectType))}} />
                                {objectType}
                            </h2>
                            <div className={'NavbarButton AlignmentsTable-Button'}
                                 onClick={() => exportJSON(objectType)}
                                 title={"Export alignment data as json file."}>
                                <FontAwesomeIcon icon={faShareFromSquare} className="NavbarButton-Icon"/>
                                Export
                            </div>
                        </div>
                        <AlignmentTable objectType={objectType} traces={object_type_alignments[objectType]}  />

                    </div>
                ))}
                {!alignmentsQuery.result && alignmentsQuery.preliminary && (
                    <Box sx={{
                        display: 'flex',
                        position: 'absolute',
                        top: '2rem',
                        right: '2rem'
                    }}>
                        <CircularProgress />
                    </Box>
                )}
            </div>
        </div>
    )
});

type AlignmentsDataProps = {
    setLogAlignments: any
    setModelAlignments: any
}
type DataProps = AlignmentsDataProps & StateProps & DispatchProps;

export type LogAlignment = {
    alignments: [
        {
            objectType: string,
            nodes: [
                {
                    source: number,
                    intermediary: number,
                    target: number,
                }
            ]
        }
    ]
}

export type ModelAlignment = {
    alignments: [
        {
            objectType: string,
            nodes: [
                {
                    source: number,
                    target: number,
                }
            ]
        }
    ]
}

/**
 * Used for visualizing alignments in the graph. It takes alignments from the backend and transforms them such that they
 * can be visualized in the cytodfm.tsx component.
 */
export const AlignmentsData = connect<StateProps, DispatchProps, AlignmentsDataProps, RootState>(mapStateToProps, mapDispatchToProps)((props: DataProps) => {
    // modelOcel corresponds to the OCEL used for the initial dfm
    // conformanceOcel is used for aligning the log to the dfm. Currently, this feature is not used.
    const modelOcel = props.modelOcel;
    const conformanceOcel = props.modelOcel;
    const threshold = props.threshold;

    // The query to fetch the alignments from the backend. Additionally, a stateBackend objects
    // is given to the backend to set/update the query state.
    const alignmentsQuery = useAsyncAPI<TraceAlignments>("/pm/alignments", {
        process_ocel: modelOcel,
        conformance_ocel: conformanceOcel,
        threshold: threshold/100.0,
    }, {
        state: props.queryState,
        setState: props.setQueryState
    });

    // When preliminary data is available, we already start transforming the alignments from the
    // backend to a frontend-friendly format which can then be visualized.
    const alignmentData = alignmentsQuery.preliminary ? alignmentsQuery.preliminary : alignmentsQuery.result;
    // Reset alignments in cytodfm to prevent errors
    props.setLogAlignments([]);
    props.setModelAlignments([]);
    if (alignmentData) {
        try {
            // These are the arrays to be used for storing the transformed alignments.
            let log_misalignments: [string, AlignElement, AlignElement, AlignElement, string[][]][] = [];
            let model_misalignments: [string, AlignElement, AlignElement, string[][]][] = [];
            alignmentData.forEach((traceWithAlignments : any) => {
                Object.keys(traceWithAlignments).forEach((objectType) => {
                    const alignment = traceWithAlignments[objectType];
                    if (alignment) {
                        if(alignment['log_alignment'].length === alignment['model_alignment'].length){
                            let alignment_copy = JSON.parse(JSON.stringify(alignment));
                            // The indices represent where a ">>" (skip move) was found to later retrieve the correct edges for each one.
                            const log_indices = alignment_copy['log_alignment'].map((item: any, index: number) => (item['activity'] === ">>" ? index : null)).filter((item: number | null) => item !== null);
                            const model_indices = alignment_copy['model_alignment'].map((item: any, index: number) => (item['activity'] === ">>" ? index : null)).filter((item: number | null) => item !== null);
                            log_indices.forEach((index: number) => {
                                // We introduced "fake" start and end events to handle traces of length 1. Since these are always
                                // present, they should always align.
                                if(index === 0){
                                    console.log("something went wrong? Explori start should always be in the log")
                                } else if(index === alignment['log_alignment'].length-1){
                                    console.log("something went wrong? Explori end should always be in the log")
                                } else {
                                    // We need an edge from: edge between last activity before to skipped activity, and edge between skipped activity and next activity
                                    // We search in model alignment for last activity and next activity (so go to start and use first activity that is not ">>")
                                    // e.g: We have index 7 where >> is seen in log, then go to model index 7 and go to start until we find first activity that is not >>
                                    //      then same with going till the end.
                                    //      We create edge between these two found ones and the activity at index 7 (is never >> since we have model move)
                                    const model_activity = alignment['model_alignment'][index];
                                    let [last_activity, next_activity] = getLastAndNextActivity(alignment, index);
                                    // Check whether the element which we want to add is not already present in the log_misalignments.
                                    // If it is present, we decided against showing duplicate edges next to each other and just sum them up onto
                                    // one edge.
                                    let element = logEqualityChecker(log_misalignments, [objectType, last_activity, model_activity, next_activity])
                                    if(element === null){
                                        log_misalignments.push([objectType, last_activity, model_activity, next_activity, [clearAndCutAlignment(alignment_copy)]])
                                    } else {
                                        element[4].push(clearAndCutAlignment(alignment_copy))
                                    }
                                }
                            })
                            // Since Explori currently works with "interval" events and not with atomic ones, we only consider one
                            // type of log moves (instead of the five possible ones).
                            model_indices.forEach((index: number) => {
                                if(index === 0){
                                    // loop on start node
                                    console.log("something went wrong? Explori start should always be in the log")
                                } else if(index === alignment['log_alignment'].length-1){
                                    // loop on end node
                                    console.log("something went wrong? Explori end should always be in the log")
                                } else {
                                    // We need an edge between the last activity found before the ">>" in the model alignment and the next one.
                                    let [last_activity, next_activity] = getLastAndNextActivity(alignment, index);
                                    let element = modelEqualityChecker(model_misalignments, [objectType, last_activity, next_activity])
                                    if(element === null){
                                        model_misalignments.push([objectType, last_activity, next_activity, [clearAndCutAlignment(alignment_copy)]])
                                    } else {
                                        element[3].push(clearAndCutAlignment(alignment_copy))
                                    }
                                }
                            })

                        }
                    }
                })
            });
            // Sets the corresponding variables in cytodfm.tsx for visualizing.
            props.setLogAlignments(log_misalignments)
            props.setModelAlignments(model_misalignments)
            //console.log(object_type_alignments['MATERIAL']);
        }
        catch (e) {
            console.error(e);
            //console.log(alignmentData)
        }
    }
    // Shows a circular waiting indicator when the alignmentsQuery is running and preliminary results were fetched to
    // indicate that not all results are present already.
    return (
        <React.Fragment>
            {!alignmentsQuery.result && alignmentsQuery.preliminary && (
                <Box sx={{
                    display: 'flex',
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem'
                }}>
                    <CircularProgress/>
                </Box>
            )}
        </React.Fragment>
    )
});

/**
 * Searches for the last activity before ">>" and the next activity after.
 * @param alignment - The alignment trace to consider
 * @param index - The index from where we start searching
 */
function getLastAndNextActivity(alignment: TraceAlignment, index: number): AlignElement[] {
    let first_activity: AlignElement = {activity: ""};
    for (let i = index-1; i >= 0; i--){
        if (alignment['model_alignment'][i].activity !== ">>"){
            first_activity = alignment['model_alignment'][i];
            break;
        }
    }
    if(first_activity.activity === ""){
        console.log("something went wrong? Explori start should always be in the log")
    }
    let second_activity: AlignElement = {activity: ""};
    for (let i = index+1; i <= alignment['log_alignment'].length; i++){
        if (alignment['model_alignment'][i].activity !== ">>"){
            second_activity = alignment['model_alignment'][i];
            break;
        }
    }
    if(second_activity.activity === ""){
        console.log("something went wrong? Explori end should always be in the log")
    }

    return [first_activity, second_activity];
}

/**
 * Checks whether the new entry is already present in the frontend-friendly log_alignments.
 * @param alignments - Current frontend-friendly log alignments
 * @param new_entry - New entry to be checked
 */
function logEqualityChecker(alignments: [string, AlignElement, AlignElement, AlignElement, string[][]][],
                         new_entry: [string, AlignElement, AlignElement, AlignElement])
{
    for (const ele of alignments){
        if(ele[0] === new_entry[0] && ele[1].activity === new_entry[1].activity && ele[2].activity === new_entry[2].activity && ele[3].activity === new_entry[3].activity){
            return ele
        }
    }
    return null
}
/**
 * Checks whether the new entry is already present in the frontend-friendly model_alignments.
 * @param alignments - Current frontend-friendly model alignments
 * @param new_entry - New entry to be checked
 */
function modelEqualityChecker(alignments: [string, AlignElement, AlignElement, string[][]][],
                            new_entry: [string, AlignElement, AlignElement])
{
    for (const ele of alignments){
        if(ele[0] === new_entry[0] && ele[1].activity === new_entry[1].activity && ele[2].activity === new_entry[2].activity){
            return ele
        }
    }
    return null
}

/**
 * Clears the skip moves (>>) out of the alignment.
 * @param alignment - The alignment to be cleared.
 */
function clearAndCutAlignment(alignment: TraceAlignment){
    let activities: string[] = []
    for(let ele of alignment['log_alignment']){
        if (ele.activity !== ">>"){
            activities.push(ele.activity)
        }
    }
    return activities
}
