import React from 'react';
import  "../DefaultLayout/DefaultLayout.css";
import {useAsyncAPI} from "../../api";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css';
import "@inovua/reactdatagrid-community/theme/blue-light.css";
import "@inovua/reactdatagrid-community/base.css";
import "@inovua/reactdatagrid-community/index.css";
import {RootState} from "../../redux/store";
import {connect} from "react-redux";


const SKIP_MOVE = ">>";
type AlignElement = {
    activity: string
};

type TraceAlignment = {
    log_alignment: AlignElement[],
    model_alignment: AlignElement[],
}

type TraceAlignments = {[key: string]: TraceAlignment | null}[];

type AlignmentProps = {
}

const mapStateToProps = (state: RootState, props: AlignmentProps) => ({
    modelOcel: state.session.ocel,
    threshold: state.session.threshold
});

const mapDispatchToProps = (state: RootState, props: AlignmentProps) => ({});

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


    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar />
            <div className="DefaultLayout-Content">
                {Object.keys(object_type_alignments).map((objectType) => (
                    <AlignmentTable objectType={objectType} traces={object_type_alignments[objectType]} key={`alignments=${objectType}`} />
                ))}
            </div>
        </div>
    )
});

export function AlignmentTable(props: {objectType: string, traces: TraceAlignment[]}) {
    const objectType = props.objectType;
    const traces = props.traces;

    const createColumns = (objectType: string, numColumns: number) => {
        let columns = new Array(numColumns);
        columns[0] = {
            name: 0, header: objectType,
        };
        for(let i = 1; i < numColumns; i++) {
            columns[i] = {
                name: i, header: "",
            };
        }
        return columns;
    };

    const createRows = (traces: TraceAlignment[]) => {
        let rows = [];
        let uniqueId = 1;
        for (let traceIdx = 0; traceIdx < traces.length; traceIdx++) {
            const trace = traces[traceIdx];
            let row: any = {
                uniqueId: uniqueId++,
                0: "Trace " + traceIdx,
                1: "[Log Alignment]",
            };
            for(let i = 0; i < trace.log_alignment.length; i++) {
                row[i + 2] = trace.log_alignment[i]['activity'];
            }
            rows.push(row);

            row = {
                uniqueId: uniqueId++,
                1: "[Model Alignment]",
            };
            for(let i = 0; i < trace.model_alignment.length; i++) {
                row[i + 2] = trace.model_alignment[i]['activity'];
            }
            rows.push(row);
        }

        return rows;
    };

    // max alignment width + 2 for trace index and log/model alignment prefix columns
    const numColumns = Math.max(...traces.map((alignment) => alignment.log_alignment.length)) + 2;
    const columns = createColumns(objectType, numColumns);
    const rows = createRows(traces);

    return (
        <div className="DefaultLayout-Container">
            <div className="DefaultLayout-Content">
                <ReactDataGrid
                    style={{
                        minHeight: 500,
                        marginTop: 16
                    }}
                    rowHeight={50}
                    theme="blue-light"
                    idProperty="uniqueId"
                    dataSource={rows}
                    columns={columns}
                    editable={false}
                    pagination
                    showColumnMenuTool={false}
                    showZebraRows={false}
                    // autosizing columns only available in enterprise edition
                    // enableColumnAutosize={true}
                    defaultShowEmptyRows={false}
                />
            </div>
        </div>
    )
}
