import React, {useCallback, useEffect, useState} from 'react';
import './UserSession.css';
import  "../DefaultLayout/DefaultLayout.css";
import {getURI} from "../../hooks";
import {Button, TextField, Stack} from "@mui/material";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css';
import { TypeDataSource } from '@inovua/reactdatagrid-community/types';
import {SessionState} from "../../redux/UserSession/userSession.types";

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
    const [fileName, setFileName] = useState('default');
    const [updated, setUpdated] = useState(false);
    const [selected, setSelected] = useState(null);

    let initialDataSource: TypeDataSource = [];
    const [dataSource, setDataSource] = useState(initialDataSource);
    const columns = [
        { name: 'name', header: 'Session name', defaultFlex: 9 },
        { name: 'age', header: 'Last change date', defaultFlex: 4 },
        { name: 'ocel', header: 'Used OCEL', defaultFlex: 4 },
        { name: 'threshold', header: 'Threshold', defaultFlex: 1.5 }
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
            threshold: data[3]
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
        content = (
            <Stack spacing={3} direction="row" justifyContent="center">
                <TextField
                    label={"Name"}
                    sx={{'top': '10px', 'color': 'rgb(var(--color1))'}}
                    id="outlined-basic"
                    defaultValue={'default'}
                    value={fileName}
                    onChange={handleChange}
                    variant="outlined"
                />
                <Button variant="contained" component="label" sx={{'top': '10px', 'background-color': 'rgb(var(--color1))'}}>
                    Store session
                    <input
                        type={"button"}
                        hidden
                        onClick={() => {
                            storeSession(fileName, userSessionState);
                            setUpdated(!updated);
                        }
                    }></input>
                </Button>
            </Stack>
        );
    } else if (storeOrRestore === "restore" && stateChangeCallback) {
        content = (
            <div className={"UserSessionRestore"}>
                <ReactDataGrid
                    idProperty={"id"}
                    theme={"blue-light"}
                    columns={columns}
                    dataSource={dataSource}
                    style={gridStyle}
                    selected={selected}
                    //enableSelection={true}
                    onSelectionChange={onSelection}
                ></ReactDataGrid>
                <Stack spacing={3} direction="row" justifyContent="center">
                    <Button variant="contained" component="label" sx={{'top': '10px', 'background-color': 'rgb(var(--color1))'}}>
                        Restore session
                        <input
                            type={"button"}
                            hidden
                            onClick={() => {
                                restoreSession(
                                    selected === null? 'default' : String(dataSource[Number(selected)].name), stateChangeCallback
                                );
                            }
                            }></input>
                    </Button>
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
