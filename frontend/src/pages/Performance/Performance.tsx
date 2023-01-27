import {RootState} from "../../redux/store";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {AsyncApiState, useAsyncAPI} from "../../hooks";
import {TraceAlignments} from "../../redux/AlignmentsQuery/alignmentsquery.types";
import {setPerformanceQueryState} from "../../redux/PerformanceQuery/performancequery";
import {connect} from "react-redux";
import {ExploriNavbar} from "../../components/ExploriNavbar/ExploriNavbar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import {getObjectTypeColor, secondsToHumanReadableFormat} from "../../utils";
import React from "react";
import {PerformanceMetrics} from "../../redux/PerformanceQuery/performancequery.types";
import ReactDataGrid from "@inovua/reactdatagrid-community";
import {downloadBlob} from "../../pages/Alignments/Alignments";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faShareFromSquare} from "@fortawesome/free-solid-svg-icons";
import '../../components/ExploriNavbar/NavbarButton/NavbarButton.css';
import './Performance.css';
import {DefaultLayout} from "../../components/DefaultLayout/DefaultLayout";

type PerformanceProps = {
}

const mapStateToProps = (state: RootState, _: PerformanceProps) => ({
    modelOcel: state.session.ocel,
    threshold: state.session.threshold,
    queryState: state.performanceQuery
});

const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, _: PerformanceProps) => ({
    setQueryState: (state: AsyncApiState<PerformanceMetrics>) => {
        dispatch(setPerformanceQueryState(state));
    }
});

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ReturnType<typeof mapDispatchToProps>;
type Props = PerformanceProps & StateProps & DispatchProps;

export const PerformanceMetricsPage = connect<StateProps, DispatchProps, PerformanceProps, RootState>(mapStateToProps, mapDispatchToProps) ((props: Props) => {
   //  const query = useAsyncAPI<PerformanceMetrics>("/pm/performance", {
   //      process_ocel: props.modelOcel,
   //      metrics_ocel: props.modelOcel,
   //      threshold: props.threshold/100.0
   //  }, {
   //      state: props.queryState,
   //      setState: props.setQueryState
   //  });
   //  const metrics = query.result ? query.result : query.preliminary;
   //  console.log(metrics);
   //  const hasMetrics = metrics != null;
   //  const totalObjectTypeCount = hasMetrics ? Object.keys(metrics).length : 0;
   //
   //  return (
   //     <div className="DefaultLayout-Container">
   //         <ExploriNavbar />
   //         <div style={{position: "relative", minHeight: "50vh"}}>
   //             {!metrics && (
   //                 <Box sx={{
   //                     display: 'flex',
   //                     position: 'absolute',
   //                     bottom: '0',
   //                     left: '50%',
   //                     'margin-right': '-50%',
   //                     transform: 'translate(-50%, -50%)'
   //                 }}>
   //                     <CircularProgress />
   //                 </Box>
   //             )}
   //             {hasMetrics && Object.keys(metrics).map((objectType, index) => (
   //                 <div className="DefaultLayout-Content Alignments-Card" key={`alignments=${objectType}`}>
   //                     <h2 className="Alignments-Card-Title">
   //                         <div className="Alignments-Card-Title-Circle" style={{backgroundColor: getObjectTypeColor(totalObjectTypeCount, index)}} />
   //                         {objectType}
   //                     </h2>
   //                     <EdgeMetrics objectType={objectType} metrics={metrics[objectType] ? metrics[objectType].edges : null}  />
   //                 </div>
   //             ))}
   //             {!query.result && query.preliminary && (
   //                 <Box sx={{
   //                     display: 'flex',
   //                     position: 'absolute',
   //                     top: '2rem',
   //                     right: '2rem'
   //                 }}>
   //                     <CircularProgress />
   //                 </Box>
   //             )}
   //         </div>
   //     </div>
   // )
    return (
        <DefaultLayout>
            <div>
                Under construction 👷
            </div>
        </DefaultLayout>
    )
});

// function EdgeMetrics(props: {objectType: string, metrics: {[key:string]: {[key: string]: EdgePerformance}} | null}) {
//     type TableEntry = {
//         id: string
//         source: string,
//         target: string,
//         mean: number,
//         median: number,
//         max: number,
//         min: number,
//         sum: number,
//         stdev: number
//     }
//
//     const entries: TableEntry[] = [];
//     if (props.metrics) {
//         Object.keys(props.metrics).forEach((source) => {
//             if (!props.metrics)
//                 return;
//             Object.keys(props.metrics[source]).forEach((target) => {
//                 if (!props.metrics)
//                     return;
//
//                 const edgePerformance = props.metrics[source][target]
//
//                 entries.push({
//                     id: source + "|" + target,
//                     source,
//                     target,
//                     ...edgePerformance
//                 })
//             })
//         });
//     }
//
//     function renderTime(data: any)  {
//         return secondsToHumanReadableFormat(data.value);
//     }
//
//     function sortTime(a: number, b: number) {
//         return a < b ? -1 : (a === b ? 0 : 1);
//     }
//
//     const columns = [
//         {name: "source", header: "From"},
//         {name: "target", header: "To"},
//         {name: "mean", header: "Mean", render: renderTime, sort: sortTime},
//         {name: "sum", header: "Total time", render: renderTime, sort: sortTime},
//         {name: "min", header: "Min", render: renderTime, sort: sortTime},
//         {name: "median", header: "Median", render: renderTime, sort: sortTime},
//         {name: "max", header: "Max", render: renderTime, sort: sortTime},
//         {name: "stdev", header: "Standard deviation", render: renderTime, sort: sortTime},
//     ]
//
//     const exportCSV = () => {
//         const header = columns.map((c) => c.name).join(",");
//         // @ts-ignore
//         const CSVrows = entries.map((data) => columns.map((c) => data[c.name]).join(","));
//
//         const contents = [header].concat(CSVrows).join('\n');
//         const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
//
//         downloadBlob(blob, "performance-data-" + props.objectType + ".csv");
//     };
//
//
//     return (
//         <React.Fragment>
//             <ReactDataGrid
//                 idProperty="id"
//                 theme={"blue-light"}
//                 columns={columns}
//                 dataSource={entries}
//                 style={{ width: "100%" }}
//             />
//             <div className={'NavbarButton Performance-Button'}
//                  onClick={exportCSV}
//                  hidden
//                  title={"Export performance metrics data as csv file."}>
//                 <FontAwesomeIcon icon={faShareFromSquare} className="NavbarButton-Icon"/>
//                 Export
//             </div>
//         </React.Fragment>
//     )
// }