import ReactDataGrid from "@inovua/reactdatagrid-community";
import React from "react";
import {TraceAlignment} from "../../redux/AlignmentsQuery/alignmentsquery.types";
import {Button} from "@mui/material";

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

    const exportCSV = () => {
        const header = columns.map((c) => c.name).join(",");
        const CSVrows = rows.map((data) => columns.map((c) => data[c.name]).join(","));

        const contents = [header].concat(CSVrows).join('\n');
        const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });

        downloadBlob(blob, "alignments-data-" + columns[0].header + ".csv");
    };

    return (
        <React.Fragment>
            <ReactDataGrid
                style={{
                    minHeight: 500,
                    marginTop: 16,
                    width: "100%",
                    minWidth: "20cm"
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
                showHeader={false}

            />
            <Button style={{ marginTop: 16 }} onClick={exportCSV}>
                Export CSV
            </Button>
        </React.Fragment>
    )
}