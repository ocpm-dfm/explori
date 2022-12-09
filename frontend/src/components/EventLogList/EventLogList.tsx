import React, { useCallback, useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import './EventLogList.css';
import '../DefaultLayout/DefaultLayout.css';
import { ExploriNavbar } from "../ExploriNavbar/ExploriNavbar";
import { Link } from "react-router-dom";
import { getURI } from "../../api";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faCheck, faMultiply, faTrash} from "@fortawesome/free-solid-svg-icons";
import { TypeDataSource } from '@inovua/reactdatagrid-community/types';
import { Session } from '../Session/Session';
import { SwitchOcelsCallback } from "../../App";
import getUuid from "uuid-by-string";

export function EventLogList(props: EventLogListProps) {
    const switchOcelsCallback = props.switchOcelsCallback;

    let initialDataSource: TypeDataSource = [];
    const uri = getURI("/logs/available", {});
    const [selected, setSelected] = useState(null);
    const [dataSource, setDataSource] = useState(initialDataSource);
    const [open, setOpen] = useState(false);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };


    // @ts-ignore
    let onSelection = useCallback(({ selected }) => {
        setSelected(selected);
    }, []);

    let onSelect = () => {
        if (selected !== null) {
            const selectedData = dataSource[selected]
            switchOcelsCallback(String(dataSource[Number(selected)].full_path));

            // @ts-ignore
            console.log(selectedData.full_path);
        }
    };

    async function onDelete() {
        if (selected !== null) {
            const ocel = String(dataSource[Number(selected)].full_path)
            const uri = getURI("/logs/delete", {file_path: ocel, uuid: getUuid(ocel)});
            await fetch(uri)
                .then((response) => response.json())
                .then((result) => {
                    setSelected(null)
                    fetchData()
                })
                .catch(err => console.log("Error in deleting ..."));
        }
    }

    let compare = (a: { dir_type: string; }, b: { dir_type: string; }) => {
        if (a.dir_type < b.dir_type) {
            return 1;
        }
        if (a.dir_type > b.dir_type) {
            return -1;
        }
        return 0;
    }

    const gridStyle = { maxHeight: "70vh", maxWidth: "70vw" }

    const columns = [
        { name: 'name', header: 'File name', defaultFlex: 8 },
        { name: 'type', header: 'Type', defaultFlex: 2 },
        { name: 'size', header: 'File size', defaultFlex: 2 },
        { name: 'extra', header: 'Uploaded', defaultFlex: 2 },
    ]

    const formatEventLogMetadata = (data: any) => {
        const eventLogMetadata = {
            full_path: data[0],
            name: data[0].split("/").pop().split(".").slice(0, -1),
            size: data[1] + " KB",
            dir_type: data[0].split("/")[0],
            extra: data[0].split("/")[0] === "uploaded" ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faMultiply} />,
            type: data[0].split(".").pop(),
        }

        return eventLogMetadata
    }

    async function fetchData(){
        fetch(uri)
            .then(res => res.json())
            .then(data => {
                if (data !== undefined || data !== null) {
                    const formattedData = data.map((eventLog: any, index: number) => {
                        const eventLogMetadata = formatEventLogMetadata(eventLog)
                        return {
                            ...eventLogMetadata,
                            id: index
                        }
                    })

                    formattedData.sort(compare)

                    // Give items correct id for selection, we get a wrong id if we assign it in the data.map already
                    for (let i = 0; i < formattedData.length; i++){
                        formattedData[i].id = i;
                    }

                    setDataSource(formattedData)
                }
            })
            .catch(err => {
                console.log("Error in loading ...")
            })
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar />
            <div className="EventLogList">
                <Stack direction="row" justifyContent="flex-end">
                    <Button variant={'outlined'} color={"error"} onClick={() => {
                        if (selected !== null){
                            handleClickOpen()
                        }
                    }} className="SelectButton" sx={
                        { 'min-width': '20px', 'bottom' : '10px'}
                    }>
                        <FontAwesomeIcon icon={faTrash} style={{marginRight: '10px'}}/>
                        Delete
                    </Button>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">
                            {"Do you really want to delete the selected OCEL?"}
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                If you decide to delete the selected OCEL, also all corresponding data like caches, autosaves, etc. will be deleted.
                                Only press yes, if you know what you are doing.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleClose} autoFocus>No</Button>
                            <Button onClick={() => {
                                onDelete()
                                handleClose()
                            }}>
                                Yes
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Stack>
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
                <Stack spacing={1} direction="row" justifyContent="flex-end">
                    <Session
                        dataSource={dataSource}
                        setDataSource={setDataSource}
                        setSelected={setSelected}
                        formatEventLogMetadata={formatEventLogMetadata}
                        compare={compare}
                    />
                    <Button component={Link} to={"/"} variant="outlined" onClick={onSelect} className="SelectButton" sx={
                        { 'top': '10px', 'margin-top': '10px', 'color': 'rgb(var(--color1))', 'border-color': 'rgb(var(--color1))' }
                    }>
                        Select
                    </Button>
                </Stack>
            </div>
        </div>
    );


}

interface EventLogListProps {
    switchOcelsCallback: SwitchOcelsCallback,
}
