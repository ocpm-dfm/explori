import React, {useCallback, useEffect, useState} from 'react';
import './UserSession.css';
import  "../DefaultLayout/DefaultLayout.css";
import {getURI} from "../../api";
import {Button, TextField, Stack} from "@mui/material";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css';
import { TypeDataSource } from '@inovua/reactdatagrid-community/types';

export type UserSessionState = {
    ocel: string,
    filteringThreshold: number,
    selectedObjectTypes: string[],
}

type BackendSession = {
    base_ocel: string,
    threshold: number,
    object_types: string[],
}

export function UserSession(props: {storeOrRestore: string, userSessionState?: UserSessionState, stateChangeCallback?: any}) {
    const storeOrRestore = props.storeOrRestore;
    const userSessionState = props.userSessionState;
    const stateChangeCallback = props.stateChangeCallback;
    const [fileName, setFileName] = useState('default');
    const [updated, setUpdated] = useState(false);
    const [selected, setSelected] = useState(null);

    let initialDataSource: TypeDataSource = [];
    const [dataSource, setDataSource] = useState(initialDataSource);
    const columns = [
        { name: 'name', header: 'Session name', defaultFlex: 8 },
        { name: 'age', header: 'Last change date', defaultFlex: 2 },
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
            age: data[1],
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

    async function storeSession(name: string, session: UserSessionState) {
        const uri = getURI("/session/store", {});

        await fetch(uri, {
            method: 'PUT',
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                session: translateToBackend(session.ocel, session.filteringThreshold, session.selectedObjectTypes),
            })
        })
            .then((response) => response.json())
            .then((result) => {
                if (result.status === "successful") {
                    localStorage.setItem('explori', JSON.stringify({
                        latest_session_name: name,
                    }));
                }
            })
            .catch(err => console.log("Error in uploading ..."))

        setUpdated(!updated)
    }

    async function restoreSession(name: string, stateChangeCallback: any) {
        const uri = getURI("/session/restore", {name: name});
        let session = "";

        await fetch(uri)
            .then((response) => response.json())
            .then((result) => {
                session = result
            })
            .catch(err => console.log("Error in uploading ..."))

        console.log(session)
        stateChangeCallback(translateToFrontend(session));
    }

    function translateToBackend(ocel: string, threshold: number, objectTypes: string[]){
        return {
            base_ocel: ocel,
            threshold: threshold,
            object_types: objectTypes,
        }
    }

    function translateToFrontend(session: any){
        return {
            ocel: session.base_ocel,
            filteringThreshold: session.threshold,
            selectedObjectTypes: session.object_types,
        }
    }

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
