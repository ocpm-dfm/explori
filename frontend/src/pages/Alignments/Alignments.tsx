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

type AlignmentProps = {
}

const mapStateToProps = (state: RootState, _: AlignmentProps) => ({
    modelOcel: state.session.ocel,
    threshold: state.session.threshold,
    queryState: state.alignmentsQuery
});

const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, _: AlignmentProps) => ({
    setQueryState: (state: AsyncApiState<TraceAlignments>) => {
        dispatch(setAlignmentQueryState(state));
    }
});

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ReturnType<typeof mapDispatchToProps>;
type Props = AlignmentProps & StateProps & DispatchProps;

export const Alignments = connect<StateProps, DispatchProps, AlignmentProps, RootState>(mapStateToProps, mapDispatchToProps)((props: Props) => {
    const modelOcel = props.modelOcel;
    const conformanceOcel = props.modelOcel;
    const threshold = props.threshold;

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
                        object_type_alignments[objectType].push(alignment);
                    }
                })
            });

            console.log(object_type_alignments['MATERIAL']);
        }
        catch (e) {
            console.error(e);
            console.log(alignmentData)
        }
    }

    const totalMaterialCount = Object.keys(object_type_alignments).length;

    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar />
            <div style={{position: "relative"}}>
                {!alignmentsQuery.result && !alignmentsQuery.preliminary && (
                    <Box sx={{
                        display: 'flex',
                        position: 'absolute',
                        top: '25rem',
                        left: '50%',
                        'margin-right': '-50%',
                        transform: 'translate(-50%, -50%)'
                    }}>
                        <CircularProgress />
                    </Box>
                )}
                {Object.keys(object_type_alignments).map((objectType, index) => (
                    <div className="DefaultLayout-Content Alignments-Card" key={`alignments=${objectType}`}>
                        <h2 className="Alignments-Card-Title">
                            <div className="Alignments-Card-Title-Circle" style={{backgroundColor: getObjectTypeColor(totalMaterialCount, index)}} />
                            {objectType}
                        </h2>
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

export const AlignmentsData = connect<StateProps, DispatchProps, AlignmentsDataProps, RootState>(mapStateToProps, mapDispatchToProps)((props: DataProps) => {
    const modelOcel = props.modelOcel;
    const conformanceOcel = props.modelOcel;
    const threshold = props.threshold;

    const alignmentsQuery = useAsyncAPI<TraceAlignments>("/pm/alignments", {
        process_ocel: modelOcel,
        conformance_ocel: conformanceOcel,
        threshold: threshold/100.0,
    }, {
        state: props.queryState,
        setState: props.setQueryState
    });

    const alignmentData = alignmentsQuery.preliminary ? alignmentsQuery.preliminary : alignmentsQuery.result;
    if (alignmentData) {
        try {
            let log_misalignments: [string, AlignElement, AlignElement, AlignElement, string[][]][] = [];
            let model_misalignments: [string, AlignElement, AlignElement, string[][]][] = [];
            alignmentData.forEach((traceWithAlignments : any) => {
                Object.keys(traceWithAlignments).forEach((objectType) => {
                    const alignment = traceWithAlignments[objectType];
                    if (alignment) {
                        if(alignment['log_alignment'].length === alignment['model_alignment'].length){
                            let alignment_copy = JSON.parse(JSON.stringify(alignment));
                            const log_indices = alignment_copy['log_alignment'].map((item: any, index: number) => (item['activity'] === ">>" ? index : null)).filter((item: number | null) => item !== null);
                            const model_indices = alignment_copy['model_alignment'].map((item: any, index: number) => (item['activity'] === ">>" ? index : null)).filter((item: number | null) => item !== null);
                            log_indices.forEach((index: number) => {
                                if(index === 0){
                                    console.log("something went wrong? Explori start should always be in the log")
                                } else if(index === alignment['log_alignment'].length-1){
                                    console.log("something went wrong? Explori end should always be in the log")
                                } else {
                                    // need edge from edge between last activity before to skipped activity and edge between skipped activity and next activity
                                    // search in model alignment for last activity and next activity (so go to start and use first activity that is not ">>")
                                    // e.g: have index 7 where >> is seen in log, then go to model index 7 and go to start until we find first activity that is not >>
                                    //      then same with going till end
                                    //      create edge between these two found ones and the activity at index 7 (is never >> since we have log move)
                                    const model_activity = alignment['model_alignment'][index];
                                    let [last_activity, next_activity] = getLastAndNextActivity(alignment, index);
                                    let element = logEqualityChecker(log_misalignments, [objectType, last_activity, model_activity, next_activity])
                                    if(element === null){
                                        log_misalignments.push([objectType, last_activity, model_activity, next_activity, [clearAndCutAlignment(alignment_copy)]])
                                    } else {
                                        element[4].push(clearAndCutAlignment(alignment_copy))
                                    }
                                }
                            })
                            model_indices.forEach((index: number) => {
                                if(index === 0){
                                    // loop on start node
                                } else if(index === alignment['log_alignment'].length-1){
                                    // loop on end node
                                } else {
                                    // loop on edge between last and next activity in model
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
            props.setLogAlignments(log_misalignments)
            props.setModelAlignments(model_misalignments)
            //console.log(object_type_alignments['MATERIAL']);
        }
        catch (e) {
            console.error(e);
            console.log(alignmentData)
        }
    }

    return null
});

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

function clearAndCutAlignment(alignment: TraceAlignment){
    let activities: string[] = []
    for(let ele of alignment['log_alignment']){
        if (ele.activity !== ">>"){
            activities.push(ele.activity)
        }
    }
    return activities
}
