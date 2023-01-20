import React, {useCallback, useEffect, useState} from 'react';
import './UserSession.css';
import  "../DefaultLayout/DefaultLayout.css";
import '../ExploriNavbar/NavbarButton/NavbarButton.css';
import {getURI} from "../../hooks";
import {Button, TextField, Stack} from "@mui/material";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";
import {DeleteSessionModal} from "./DeleteSessionModal";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css';
import { TypeDataSource } from '@inovua/reactdatagrid-community/types';
import {SessionState} from "../../redux/UserSession/userSession.types";
import { useNavigate } from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faDownload, faSave, faShareFromSquare, faTrash} from "@fortawesome/free-solid-svg-icons";
import {DeleteEventLogModal} from "../EventLogList/DeleteEventLogModal/DeleteEventLogModal";
import getUuid from "uuid-by-string";

type BackendSession = {
    base_ocel: string,
    threshold: number,
    object_types: string[],
    highlighting_mode: string | null
    graph_horizontal: boolean,
    alignment_mode: string,
    legend_position: string,
    performance_mode: string,
}

export function UserSession(props: {storeOrRestore: string, userSessionState?: SessionState, stateChangeCallback?: any}) {
    const storeOrRestore = props.storeOrRestore;
    const userSessionState = props.userSessionState;
    const stateChangeCallback = props.stateChangeCallback;
    const [fileName, setFileName] = useState(userSessionState? userSessionState.ocel.split("/").pop()?.split(".").slice(0, -1).toString() : 'default');
    const [updated, setUpdated] = useState(false);
    const [selected, setSelected] = useState(null);
    const [sessionToBeDeleted, setSessionToBeDeleted] = useState(null);
    const navigate = useNavigate();

    let initialDataSource: TypeDataSource = [];
    const [dataSource, setDataSource] = useState(initialDataSource);
    const columns = [
        { name: 'name', header: 'Session name', defaultFlex: 9 },
        { name: 'age', header: 'Last change date', defaultFlex: 4 },
        { name: 'ocel', header: 'Used OCEL', defaultFlex: 4 },
        { name: 'threshold', header: 'Threshold', defaultFlex: 1 },
        { name: 'objects', header: 'Object types', defaultFlex: 4},
        { name: 'alignments', header: 'Alignments', defaultFlex: 2},
        { name: 'performance', header: 'Performance', defaultFlex: 2},
        { name: 'deleteButton', header: '', defaultFlex: .25}
    ]

    let compareDates = (a: { age: number; }, b: { age: number; }) => {
        if (a.age < b.age) {
            return 1;
        }
        if (a.age > b.age) {
            return -1;
        }
        return 0;
    }

    const gridStyle = { maxHeight: "70vh", maxWidth: "70vw" }

    const formatSessionMetadata = (data: any) => {
        return {
            name: data[0],
            age: new Date(data[1] * 1000).toLocaleString('en-US'),
            ocel: data[2].split("/").pop().split(".").slice(0, -1),
            threshold: data[3],
            objects: data[4].toString(),
            alignments: data[5],
            performance: data[6],
            deleteButton:
                <button className="EventLogTable-DeleteButton"
                        onClick={(event) => {
                            setSessionToBeDeleted(data[0]);
                            event.stopPropagation();
                        }}
                        title={"Shows prompt for deletion of this saved session."}
                >
                    <FontAwesomeIcon icon={faTrash}/>
                </button>
        }
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFileName(event.target.value);
    };

    // @ts-ignore
    let onSelection = useCallback(({ selected }) => {
        setSelected(selected);
    }, []);

    let availableURI = getURI("/session/available", {});
    useEffect(() => {
        fetch(availableURI)
            .then((response) => response.json())
            .then((result) => {
                if (result !== undefined || result !== null) {
                    const formattedData = result.map((session: any, index: number) => {
                        const sessionMetadata = formatSessionMetadata(session)
                        return {
                            ...sessionMetadata,
                            id: index
                        }
                    })

                    formattedData.sort(compareDates)

                    // Give items correct id for selection, we get a wrong id if we assign it in the data.map already
                    for (let i = 0; i < formattedData.length; i++){
                        formattedData[i].id = i;
                    }

                    setDataSource(formattedData)
                }
            })
            .catch(err => console.log("Error in fetching available sessions ..."))
    }, [updated])

    let content;
    if (storeOrRestore === "store" && userSessionState) {

        const sessionColumns = [
            { name: 'key', header: 'Key', defaultFlex: 5 },
            { name: 'value', header: 'Value', defaultFlex: 10 }
        ]
        const data = [
            { key: "OCEL", value: userSessionState.ocel},
            { key: "Threshold", value: userSessionState.threshold},
            { key: "Selected object types", value: JSON.stringify(userSessionState.selectedObjectTypes)},
            { key: "Graph orientation", value: userSessionState.graphHorizontal? 'Left to right': 'Top to down'},
            { key: "Highlighting mode", value: userSessionState.highlightingMode},
            { key: "Legend position", value: userSessionState.legendPosition},
            { key: "Alignment mode", value: userSessionState.alignmentMode},
            { key: "Performance indicator", value: userSessionState.performanceMode},
        ]
        content = (
            <React.Fragment>
                <Stack spacing={3} direction="row" justifyContent="center">
                    <TextField
                        label={"Name"}
                        sx={{'top': '10px', 'color': 'rgb(var(--color1))'}}
                        id="outlined-basic"
                        value={fileName}
                        onChange={handleChange}
                        variant="outlined"
                    />
                    <div className={'NavbarButton UserSessionStore-Button'}
                         title={"Stores current session with values seen below."}
                         onClick={() => {
                             if (fileName)
                                 storeSession(fileName, userSessionState);
                             else
                                 storeSession('default', userSessionState);
                             setUpdated(!updated);
                         }}
                    >
                        <FontAwesomeIcon icon={faSave} className="NavbarButton-Icon"/>
                        Store Session
                    </div>
                </Stack>
                What will be saved:
                <ReactDataGrid
                    idProperty={"id"}
                    theme={"blue-light"}
                    columns={sessionColumns}
                    dataSource={data}
                    showCellBorders={'vertical'}
                    rowHeight={50}
                    style={{
                        minHeight: 500,
                        marginTop: 16,
                        width: "100%",
                        minWidth: "20cm"
                    }}
                ></ReactDataGrid>
            </React.Fragment>
        );
    } else if (storeOrRestore === "restore" && stateChangeCallback) {
        content = (
            <div className={"UserSessionRestore UserSession-Card"}>
                <DeleteSessionModal selectedSession={sessionToBeDeleted}
                                     afterDelete={async () => {
                                         setSelected(null);
                                         setUpdated(!updated)
                                     }}
                                     onClose={() => setSessionToBeDeleted(null)} />
                <ReactDataGrid
                    idProperty={"id"}
                    theme={"blue-light"}
                    columns={columns}
                    dataSource={dataSource}
                    style={gridStyle}
                    selected={selected}
                    onSelectionChange={onSelection}
                ></ReactDataGrid>
                <Stack spacing={3} direction="row" justifyContent="center">
                    <div className={'NavbarButton UserSessionRestore-Button'}
                         title={"Restores selected session from cache and goes to Homepage."}
                         onClick={async () => {
                             await restoreSession(
                                 selected === null ? 'default' : String(dataSource[Number(selected)].name), stateChangeCallback
                             );
                             navigate("/");
                         }}
                    >
                        <FontAwesomeIcon icon={faDownload} className="NavbarButton-Icon"/>
                        Restore Session
                    </div>
                </Stack>
            </div>
        );
    }

    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar />
            <div className="DefaultLayout-Content">
                {content}
            </div>
        </div>
    )
}

export async function storeSession(name: string, session: SessionState) {
    const uri = getURI("/session/store", {});

    await fetch(uri, {
        method: 'PUT',
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            session: translateToBackend(session),
        })
    })
        .then((response) => response.json())
        .then((result) => {
            if (result.status === "successful") {
                console.log("Storing of session " + name + " successful!");
            }
        })
        .catch(err => console.log("Error in uploading ..."));
}

export async function restoreSession(name: string, stateChangeCallback: any) {
    const uri = getURI("/session/restore", {name: name});
    
    await fetch(uri)
        .then((response) => response.json())
        .then((result) => {
            stateChangeCallback(translateToFrontend(result));
            console.log("Restoring of session " + name + " successful!");
        })
        .catch(err => console.log("Error in uploading ..."));
}

function translateToBackend(session: SessionState): BackendSession{
    return {
        base_ocel: session.ocel,
        threshold: session.threshold,
        object_types: session.selectedObjectTypes,
        highlighting_mode: session.highlightingMode,
        graph_horizontal: session.graphHorizontal,
        alignment_mode: session.alignmentMode,
        legend_position: session.legendPosition,
        performance_mode: session.performanceMode,
    }
}

function translateToFrontend(session: BackendSession): SessionState {
    return {
        ocel: session.base_ocel,
        threshold: session.threshold,
        selectedObjectTypes: session.object_types,
        // Set `alreadySelectedAllObjectTypesInitially` to true as we're in the process of restoring a session
        // which implies an existing object type selection which we don't want to overwrite!
        alreadySelectedAllObjectTypesInitially: true,
        highlightingMode: session.highlighting_mode,
        graphHorizontal: session.graph_horizontal,
        alignmentMode: session.alignment_mode,
        legendPosition: session.legend_position,
        performanceMode: session.performance_mode,
    }
}
