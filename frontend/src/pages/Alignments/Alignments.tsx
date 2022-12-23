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
import {TraceAlignment, TraceAlignments} from "../../redux/AlignmentsQuery/alignmentsquery.types";
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
            alignmentData.forEach((traceWithAlignments) => {
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
            <div>
                {!alignmentsQuery.result && !alignmentsQuery.preliminary && (
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
                        top: '14%',
                        left: '98%',
                        'margin-right': '-50%',
                        transform: 'translate(-50%, -50%)'
                    }}>
                        <CircularProgress />
                    </Box>
                )}
            </div>
        </div>
    )
});
