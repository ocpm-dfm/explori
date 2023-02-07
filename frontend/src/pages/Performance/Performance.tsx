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
import React, {useState} from "react";
import {AggregatedMetric, PerformanceMetrics} from "../../redux/PerformanceQuery/performancequery.types";
import ReactDataGrid from "@inovua/reactdatagrid-community";
import {downloadBlob} from "../../pages/Alignments/Alignments";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faShareFromSquare} from "@fortawesome/free-solid-svg-icons";
import '../../components/ExploriNavbar/NavbarButton/NavbarButton.css';
import './Performance.css';
import {DefaultLayout} from "../../components/DefaultLayout/DefaultLayout";
import {DropdownCheckbox} from "../../components/ExploriNavbar/NavbarDropdown/DropdownCheckbox/DropdownCheckbox";
import {DirectlyFollowsMultigraph} from "../../components/cytoscape-dfm/cytodfm";
import {setDfmQueryState} from "../../redux/DFMQuery/dfmquery";

type PerformanceProps = {}

const EXPORT_AGGREGATE_ORDER = ["min", "mean", "median", "max", "sum", "stdev"];

const mapStateToProps = (state: RootState, _: PerformanceProps) => ({
    modelOcel: state.session.ocel,
    threshold: state.session.threshold,
    queryState: state.performanceQuery,
    dfmState: state.dfmQuery
});

const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, _: PerformanceProps) => ({
    setQueryState: (state: AsyncApiState<PerformanceMetrics>) => {
        dispatch(setPerformanceQueryState(state));
    },
    setDfmState: (state: AsyncApiState<DirectlyFollowsMultigraph>) => {
        dispatch(setDfmQueryState(state))
    }
});

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ReturnType<typeof mapDispatchToProps>;
type Props = PerformanceProps & StateProps & DispatchProps;

export const PerformanceMetricsPage = connect<StateProps, DispatchProps, PerformanceProps, RootState>(mapStateToProps, mapDispatchToProps)((props: Props) => {
    const metricsQuery = useAsyncAPI<PerformanceMetrics>("/pm/ocel-performance", {
        process_ocel: props.modelOcel,
        metrics_ocel: props.modelOcel,
        threshold: props.threshold / 100.0
    }, {
        state: props.queryState,
        setState: props.setQueryState
    });
    const metrics = metricsQuery.result ? metricsQuery.result : metricsQuery.preliminary;

    // We need the total number of object types. Therefore, we fetch the graph, most likely from the Redux state.
    const dfmQuery = useAsyncAPI<DirectlyFollowsMultigraph>("/pm/dfm", {ocel: props.modelOcel},
        {state: props.dfmState, setState: props.setDfmState});
    const objectTypeColors: { [key: string]: string } = {}
    if (dfmQuery.result) {
        const objectTypes = Object.keys(dfmQuery.result.subgraphs);
        objectTypes.forEach((ot, index) =>
            objectTypeColors[ot] = getObjectTypeColor(objectTypes.length, index));
    }
    const hasMetrics = dfmQuery.result != null && metrics != null;

    let content = null;
    if (hasMetrics) {
        content = (
            <React.Fragment>
                <div className="DefaultLayout-Content Alignments-Card">
                    <div className="Alignments-Card-Title-Container">
                        <h2 className="Alignments-Card-Title">
                            Node metrics
                        </h2>
                        <div className={'NavbarButton AlignmentsTable-Button'}
                             onClick={() => exportNodeMetrics(metrics)}
                             title={"Export alignment data as json file."}>
                            <FontAwesomeIcon icon={faShareFromSquare} className="NavbarButton-Icon"/>
                            Export
                        </div>
                    </div>
                    <NodeMetrics metrics={metrics}/>
                </div>
                <div className="DefaultLayout-Content Alignments-Card">
                    <div className="Alignments-Card-Title-Container">
                        <h2 className="Alignments-Card-Title">
                            Pooling times
                        </h2>
                        <div className={'NavbarButton AlignmentsTable-Button'}
                             onClick={() => exportNodePoolingTimes(metrics)}
                             title={"Export alignment data as json file."}>
                            <FontAwesomeIcon icon={faShareFromSquare} className="NavbarButton-Icon"/>
                            Export
                        </div>
                    </div>
                    <PoolingTimes metrics={metrics} objectTypeColors={objectTypeColors}/>
                </div>
                <div className="DefaultLayout-Content Alignments-Card">
                    <div className="Alignments-Card-Title-Container">
                        <h2 className="Alignments-Card-Title">
                            Edge metrics
                        </h2>
                        <div className={'NavbarButton AlignmentsTable-Button'}
                             onClick={() => exportEdgeMetrics(metrics)}
                             title={"Export alignment data as json file."}>
                            <FontAwesomeIcon icon={faShareFromSquare} className="NavbarButton-Icon"/>
                            Export
                        </div>
                    </div>
                    <EdgeMetrics metrics={metrics} objectTypeColors={objectTypeColors}/>
                </div>
            </React.Fragment>
        )
    } else {
        content = (
            <CircularProgress className="Performance-Waiting-Circle"/>
        )
    }

    return (<div className="DefaultLayout-Container">
        <ExploriNavbar/>
        {content}
    </div>)
});

function NodeMetrics(props: { metrics: PerformanceMetrics }) {
    const metricsOrder = ["service_time", "waiting_time", "sojourn_time", "lagging_time", "synchronization_time", "flow_time"];
    const metricDisplayNames: { [key: string]: string } = {
        "service_time": "Service time",
        "waiting_time": "Waiting time",
        "sojourn_time": "Sojourn time",
        "lagging_time": "Lagging time",
        "synchronization_time": "Synchronization time",
        "flow_time": "Flow time",
    }
    const [selectedMetrics, setSelectedMetrics] = useState<{ [key: string]: boolean }>({
        "service_time": true,
        "waiting_time": true,
        "sojourn_time": false,
        "lagging_time": true,
        "synchronization_time": false,
        "flow_time": false
    });

    const aggregateOrder = ["min", "mean", "median", "max", "sum", "stdev"]
    const [selectedAggregates, setSelectedAggregates] = useState<{ [key: string]: boolean }>({
        "min": false,
        "mean": true,
        "median": false,
        "max": true,
        "sum": false,
        "stdev": false
    });
    const aggregateDisplayNames: { [key: string]: string } = {
        "min": "Min",
        "mean": "Mean",
        "median": "Median",
        "max": "Max",
        "sum": "Total",
        "stdev": "Standard deviation"
    }

    type TableEntry = {
        node: string,
        "service_time.min": number
        "service_time.mean": number
        "service_time.median": number
        "service_time.max": number
        "service_time.sum": number
        "service_time.stdev": number
        "waiting_time.min": number
        "waiting_time.mean": number
        "waiting_time.median": number
        "waiting_time.max": number
        "waiting_time.sum": number
        "waiting_time.stdev": number
        "sojourn_time.min": number
        "sojourn_time.mean": number
        "sojourn_time.median": number
        "sojourn_time.max": number
        "sojourn_time.sum": number
        "sojourn_time.stdev": number
        "synchronization_time.min": number
        "synchronization_time.mean": number
        "synchronization_time.median": number
        "synchronization_time.max": number
        "synchronization_time.sum": number
        "synchronization_time.stdev": number
        "lagging_time.min": number
        "lagging_time.mean": number
        "lagging_time.median": number
        "lagging_time.max": number
        "lagging_time.sum": number
        "lagging_time.stdev": number
        "flow.min": number
        "flow.mean": number
        "flow.median": number
        "flow.max": number
        "flow.sum": number
        "flow.stdev": number
    }

    const entries: TableEntry[] = [];
    Object.keys(props.metrics.nodes).forEach((node) => {
        const nodeMetrics = props.metrics.nodes[node];
        entries.push({
            node,
            ...flatten_aggregated_metric(nodeMetrics.waiting_time, 'waiting_time'),
            ...flatten_aggregated_metric(nodeMetrics.service_time, 'service_time'),
            ...flatten_aggregated_metric(nodeMetrics.sojourn_time, 'sojourn_time'),
            ...flatten_aggregated_metric(nodeMetrics.synchronization_time, 'synchronization_time'),
            ...flatten_aggregated_metric(nodeMetrics.lagging_time, 'lagging_time'),
            ...flatten_aggregated_metric(nodeMetrics.flow_time, 'flow_time'),
        } as TableEntry)
    });

    const columns: any[] = [
        {name: "node", header: "Node"}
    ]
    metricsOrder.forEach(metric => {
        if (!selectedMetrics[metric])
            return;

        aggregateOrder.forEach(aggregate => {
            if (!selectedAggregates[aggregate])
                return;

            let render = undefined;
            if (aggregate !== "stdev")
                render = renderTime;
            columns.push({
                name: `${metric}.${aggregate}`,
                header: `${aggregateDisplayNames[aggregate]} ${metricDisplayNames[metric]}`,
                render: render,
                sort: sortTime
            })
        })
    });

    const MetricCheckbox = (p: { metric: string }) => (
        <DropdownCheckbox selected={selectedMetrics[p.metric]} label={metricDisplayNames[p.metric]}
                          onClick={() => {
                              setSelectedMetrics((oldMetrics) => {
                                  const result = {...oldMetrics};
                                  result[p.metric] = !oldMetrics[p.metric];
                                  return result;
                              })
                          }
                          }/>
    )

    const AggregateCheckbox = (p: { aggregate: string }) => (
        <DropdownCheckbox selected={selectedAggregates[p.aggregate]} label={aggregateDisplayNames[p.aggregate]}
                          onClick={() => {
                              setSelectedAggregates((oldAggregates) => {
                                  const result = {...oldAggregates};
                                  result[p.aggregate] = !oldAggregates[p.aggregate];
                                  return result;
                              })
                          }
                          }/>
    )

    return (
        <div className="Performance-Node-Metrics-Container">
            <ReactDataGrid
                idProperty="id"
                theme={"blue-light"}
                columns={columns}
                dataSource={entries}
                style={{width: "100%"}}
                className="Performance-Node-Metrics-Table"
            />
            <div className="Performance-Node-Metrics-Settings">
                <div className="Performance-Node-Metrics-Settings-Header">
                    Shown metrics
                </div>
                <MetricCheckbox metric="service_time"/>
                <MetricCheckbox metric="waiting_time"/>
                <MetricCheckbox metric="sojourn_time"/>
                <MetricCheckbox metric="lagging_time"/>
                <MetricCheckbox metric="synchronization_time"/>
                <MetricCheckbox metric="flow_time"/>
            </div>
            <div className="Performance-Node-Metrics-Settings">
                <div className="Performance-Node-Metrics-Settings-Header">
                    Shown aggregates
                </div>
                <AggregateCheckbox aggregate="min"/>
                <AggregateCheckbox aggregate="mean"/>
                <AggregateCheckbox aggregate="median"/>
                <AggregateCheckbox aggregate="max"/>
                <AggregateCheckbox aggregate="sum"/>
                <AggregateCheckbox aggregate="stdev"/>
            </div>
        </div>
    )
}


function PoolingTimes(props: { metrics: PerformanceMetrics, objectTypeColors: { [key: string]: string } }) {
    type TableEntry = {
        node: string,
        objectType: any,
        min: number,
        mean: number,
        median: number,
        max: number,
        sum: number,
        stdev: number
    }

    const entries: TableEntry[] = [];
    Object.keys(props.metrics.nodes).forEach((node) => {
        const nodeMetrics = props.metrics.nodes[node];
        Object.entries(nodeMetrics.pooling_times).forEach(([objectType, poolingTime]) => {
            const otCell = (
                <div className="Performance-Pooling-OT" key={`Pooling-Time-${node}-${objectType}`}>
                    <div className="Performance-Pooling-OTCircle"
                         style={{backgroundColor: props.objectTypeColors[objectType]}}/>
                    {objectType}
                </div>)
            entries.push({
                node,
                objectType: otCell,
                min: poolingTime.min,
                mean: poolingTime.mean,
                median: poolingTime.median,
                max: poolingTime.max,
                sum: poolingTime.sum,
                stdev: poolingTime.stdev
            });
        });
    });

    const columns = [
        {name: "node", header: "Node"},
        {name: "objectType", header: "Object Type"},
        {name: "min", header: "Minimum", render: renderTime},
        {name: "mean", header: "Mean", render: renderTime},
        {name: "median", header: "Median", render: renderTime},
        {name: "max", header: "Maximum", render: renderTime},
        {name: "sum", header: "Total", render: renderTime},
        {name: "stdev", header: "Standard deviation"},
    ];

    return <ReactDataGrid
        idProperty="id"
        theme={"blue-light"}
        columns={columns}
        dataSource={entries}
        style={{width: "100%"}}
    />
}


function EdgeMetrics(props: { metrics: PerformanceMetrics, objectTypeColors: { [key: string]: string } }) {
    const metricsOrder = ["pooling_time", "waiting_time"];
    const metricDisplayNames: { [key: string]: string } = {
        "waiting_time": "Waiting time",
        "pooling_time": "Pooling time",
    }
    const [selectedMetrics, setSelectedMetrics] = useState<{ [key: string]: boolean }>({
        "pooling_time": true,
        "waiting_time": true,
    });

    const aggregateOrder = ["min", "mean", "median", "max", "sum", "stdev"]
    const [selectedAggregates, setSelectedAggregates] = useState<{ [key: string]: boolean }>({
        "min": false,
        "mean": true,
        "median": false,
        "max": true,
        "sum": false,
        "stdev": false
    });
    const aggregateDisplayNames: { [key: string]: string } = {
        "min": "Min",
        "mean": "Mean",
        "median": "Median",
        "max": "Max",
        "sum": "Total",
        "stdev": "Standard deviation"
    }

    type TableEntry = {
        source: string,
        target: string,
        objectType: any,
        "pooling_time.min": number
        "pooling_time.mean": number
        "pooling_time.median": number
        "pooling_time.max": number
        "pooling_time.sum": number
        "pooling_time.stdev": number
        "waiting_time.min": number
        "waiting_time.mean": number
        "waiting_time.median": number
        "waiting_time.max": number
        "waiting_time.sum": number
        "waiting_time.stdev": number
    }

    const entries: TableEntry[] = [];


    Object.keys(props.metrics.edges).forEach((source) => {
        Object.keys(props.metrics.edges[source]).forEach((target) => {
            Object.keys(props.metrics.edges[source][target]).forEach((objectType) => {
                const edgeMetrics = props.metrics.edges[source][target][objectType];
                const otCell = (
                    <div className="Performance-Pooling-OT" key={`Edge-OT-${source}-${target}-${objectType}`}>
                        <div className="Performance-Pooling-OTCircle"
                             style={{backgroundColor: props.objectTypeColors[objectType]}}/>
                        {objectType}
                    </div>)
                entries.push({
                    source,
                    target,
                    objectType: otCell,
                    ...flatten_aggregated_metric(edgeMetrics.pooling_time, "pooling_time"),
                    ...flatten_aggregated_metric(edgeMetrics.waiting_time, "waiting_time")
                } as TableEntry)
            })
        })
    });

    const columns: any[] = [
        {name: "source", header: "Source"},
        {name: "target", header: "Target"},
        {name: "objectType", header: "Object type"},
    ]
    metricsOrder.forEach(metric => {
        if (!selectedMetrics[metric])
            return;

        aggregateOrder.forEach(aggregate => {
            if (!selectedAggregates[aggregate])
                return;

            let render = undefined;
            if (aggregate !== "stdev")
                render = renderTime;
            columns.push({
                name: `${metric}.${aggregate}`,
                header: `${aggregateDisplayNames[aggregate]} ${metricDisplayNames[metric]}`,
                render: render,
                sort: sortTime
            })
        })
    });

    //console.log(columns)
    //console.log(entries)

    const MetricCheckbox = (p: { metric: string }) => (
        <DropdownCheckbox selected={selectedMetrics[p.metric]} label={metricDisplayNames[p.metric]}
                          onClick={() => {
                              setSelectedMetrics((oldMetrics) => {
                                  const result = {...oldMetrics};
                                  result[p.metric] = !oldMetrics[p.metric];
                                  return result;
                              })
                          }
                          }/>
    )

    const AggregateCheckbox = (p: { aggregate: string }) => (
        <DropdownCheckbox selected={selectedAggregates[p.aggregate]} label={aggregateDisplayNames[p.aggregate]}
                          onClick={() => {
                              setSelectedAggregates((oldAggregates) => {
                                  const result = {...oldAggregates};
                                  result[p.aggregate] = !oldAggregates[p.aggregate];
                                  return result;
                              })
                          }
                          }/>
    )

    return (
        <div className="Performance-Node-Metrics-Container">
            <ReactDataGrid
                idProperty="id"
                theme={"blue-light"}
                columns={columns}
                dataSource={entries}
                style={{width: "100%"}}
                className="Performance-Node-Metrics-Table"
            />
            <div className="Performance-Node-Metrics-Settings">
                <div className="Performance-Node-Metrics-Settings-Header">
                    Shown metrics
                </div>
                <MetricCheckbox metric="pooling_time"/>
                <MetricCheckbox metric="waiting_time"/>
            </div>
            <div className="Performance-Node-Metrics-Settings">
                <div className="Performance-Node-Metrics-Settings-Header">
                    Shown aggregates
                </div>
                <AggregateCheckbox aggregate="min"/>
                <AggregateCheckbox aggregate="mean"/>
                <AggregateCheckbox aggregate="median"/>
                <AggregateCheckbox aggregate="max"/>
                <AggregateCheckbox aggregate="sum"/>
                <AggregateCheckbox aggregate="stdev"/>
            </div>
        </div>
    )
}

function flatten_aggregated_metric(metric: AggregatedMetric | null, name: string) {
    const result: { [key: string]: number | null } = {};
    if (metric) {
        result[`${name}.min`] = metric.min;
        result[`${name}.mean`] = metric.mean;
        result[`${name}.median`] = metric.median;
        result[`${name}.max`] = metric.max;
        result[`${name}.sum`] = metric.sum;
        result[`${name}.stdev`] = metric.stdev;
    } else {
        result[`${name}.min`] = null;
        result[`${name}.mean`] = null;
        result[`${name}.median`] = null;
        result[`${name}.max`] = null;
        result[`${name}.sum`] = null;
        result[`${name}.stdev`] = null;
    }
    return result;
}

function renderTime(data: any) {
    if (!data || data.value === null)
        return "";
    return secondsToHumanReadableFormat(data.value);
}

function sortTime(a: number | null, b: number | null) {
    if (a === null && b === null)
        return 0;
    if (a === null)
        return -1;
    if (b === null)
        return 1;
    return a < b ? -1 : (a === b ? 0 : 1);
}

function aggreatedMetricToCommaSeperatedListForExport(metric: AggregatedMetric | null): string {
    if (!metric)
        return EXPORT_AGGREGATE_ORDER.map((agg) => "").join(',')
    return EXPORT_AGGREGATE_ORDER.map((agg) => (metric as any)[agg]).join(',')
}

function exportNodeMetrics(metrics: PerformanceMetrics) {
    const simpleMetrics = ["service_time", "waiting_time", "sojourn_time", "lagging_time", "synchronization_time", "flow_time"];
    const header = ["node"]
        .concat(
            simpleMetrics
                .map((metric) => EXPORT_AGGREGATE_ORDER.map((agg) => `${metric} ${agg}`).join(','))
                .join(","))
        .join(',')
    const entries = Object.entries(metrics.nodes).map(([node, nodeMetric]) =>
        [node]
            .concat(simpleMetrics
                .map((metric) => aggreatedMetricToCommaSeperatedListForExport((nodeMetric as any)[metric])))
            .join(','));
    const blob = new Blob([[header].concat(entries).join('\n')], {type: 'text/csv;charset=utf-8;'});
    downloadBlob(blob, "node-metrics.csv");
}

function exportNodePoolingTimes(metrics: PerformanceMetrics) {
    const header = ["node", "object_type"].concat(EXPORT_AGGREGATE_ORDER).join(',')
    const entries = Object.entries(metrics.nodes)
        .map(([node, nodeMetrics]) =>
            Object.entries(nodeMetrics.pooling_times)
                .map(([objectType, poolingTime]) =>
                    [node, objectType].concat(aggreatedMetricToCommaSeperatedListForExport(poolingTime)).join(','))
                .join('\n'))
    const blob = new Blob([[header].concat(entries).join('\n')], {type: 'text/csv;charset=utf-8;'});
    downloadBlob(blob, "node-pooling-times.csv");
}

function exportEdgeMetrics(metrics: PerformanceMetrics) {
    const metricNames = ["pooling_time", "waiting_time"];
    const header = ["node"]
        .concat(
            metricNames
                .map((metric) => EXPORT_AGGREGATE_ORDER.map((agg) => `${metric} ${agg}`).join(','))
                .join(","))
        .join(',')
    const entries: string[] = [];
    Object.entries(metrics.edges).forEach(([source, targets]) => {
         Object.entries(targets).forEach(([target, objectTypes]) => {
             Object.entries(objectTypes).forEach(([objectType, edgeMetrics]) => {
                entries.push([source, target, objectTypes]
                    .concat(aggreatedMetricToCommaSeperatedListForExport(edgeMetrics.pooling_time))
                    .concat(aggreatedMetricToCommaSeperatedListForExport(edgeMetrics.waiting_time))
                    .join(','))
             });
        });
    });
    const blob = new Blob([[header].concat(entries).join('\n')], {type: 'text/csv;charset=utf-8;'});
    downloadBlob(blob, "edge-metrics.csv");
}