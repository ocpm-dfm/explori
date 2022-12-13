import React, { useCallback, useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
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

interface columnType {
    name: string,
    header: string,
    defaultWidth: number
}

export function EventLogList(props: EventLogListProps) {
    const switchOcelsCallback = props.switchOcelsCallback;

    let initialDataSource: TypeDataSource = [];
    let initialColumns: columnType[] = [];
    let initialObjectTypes: string[] = [];
    const uri = getURI("/logs/available", {});
    const [selected, setSelected] = useState(null);
    const [dataSource, setDataSource] = useState(initialDataSource);
    const [columnsCSV, setColumnsCSV] = useState(initialColumns);
    const [dataCSV, setDataCSV] = useState(initialDataSource);
    const [csvSelected, setCSVSelected] = useState(false);
    const [selectedCSVLog, setSelectedCSVLog] = useState("");
    const [open, setOpen] = useState(false);

    const [objectTypes, setObjectTypes] = useState(initialObjectTypes);
    const [activityName, setActivityName] = useState("");
    const [timestampName, setTimestampName] = useState("");
    const [separator, setSeparator] = useState(",");

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleObjectTypeChange = (event: SelectChangeEvent<string[]>) => {
        const {
            target: { value },
        } = event;
        if (typeof value === "string") {
            setObjectTypes([value])
        } else {
            setObjectTypes(value)
        }
    };

    const handleActivityNameChange = (event: SelectChangeEvent<string>) => {
        const {
            target: { value },
        } = event;
        setActivityName(value);
    };

    const handleTimestampNameChange = (event: SelectChangeEvent<string>) => {
        const {
            target: { value },
        } = event;
        setTimestampName(value);
    };

    const handleSeparatorChange = (event: SelectChangeEvent<string>) => {
        const {
            target: { value },
        } = event;
        setSeparator(value);
    };

    //TODO: check which separators are supported by OCPA
    const separators = [
        ',',
        ';',
        '""',
        'TAB',
        '/',
        '{}'
    ]

    let clearSelectData = () => {
        // Reset to default values
        setObjectTypes([]);
        setActivityName("");
        setTimestampName("");
        setSeparator(",");
    }

    // @ts-ignore
    let onSelection = ({ selected }) => {
        if(String(dataSource[Number(selected)].type) === "csv"){
            // We set the flag to render the Select components and fetch needed data
            setCSVSelected(true);
            getCSVData(selected);
            getColumns(selected);
            // To clear the input when we click on another csv, but not if we click on the same one again,
            // we remember which csv event log was last clicked and clear variables if it is a new one
            let csvLog = String(dataSource[Number(selected)].name);
            if(selectedCSVLog !== csvLog){
                setSelectedCSVLog(csvLog);
                clearSelectData();
            }
        } else {
            setCSVSelected(false);
        }
        setSelected(selected);
    };

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
                    fetchListData()
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

    const gridStyle = { maxHeight: "70vh", maxWidth: "85vw" }

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

    function generateColumns(columnData: string[]){
        return columnData.map((columnName: string) => {
            return {
                name: columnName,
                header: columnName,
                defaultWidth: 150
            }
        })
    }

    function findDefaultValue(columnData: columnType[], value: string, isMultiple: boolean){
        let matches: string[] = [];
        columnData.map((column: columnType) => {
            if(column.name.search(value) !== -1){
                matches.push(column.name)
            }
        })
        if(matches.length !== 0) {
            if (!isMultiple) {
                return matches[0]
            }
        }
        return matches
    }

    function generateSelect(
        label: string,
        changeValue: any,
        values: any[],
        handleChange: ((event: SelectChangeEvent<any[] | any>, child: React.ReactNode) => void) | undefined,
        isMultiple: boolean,
        setDefaultValue: any,
        defaultString: string,
    ){
        if(
            changeValue !== undefined &&
            (
                // Either, we never rendered a csv selection component
                (changeValue === "" || (Array.isArray(changeValue) && changeValue.length === 0)) ||
                // Or, we already did, but use a new csv file now
                !( (!Array.isArray(changeValue) && values.map((value) => {return value.name}).includes(changeValue)) ||
                    (Array.isArray(changeValue) && changeValue.every(v => values.map((value) => {return value.name}).includes(v)))
                )
            )
        ){
            const defaultValues = findDefaultValue(values, defaultString, isMultiple)
            if((Array.isArray(defaultValues) && defaultValues.length !== 0) || !Array.isArray(defaultValues)){
                setDefaultValue(defaultValues);
            }
        }
        return (
            <FormControl size="small" sx={{ m: 1, width: '80vw' }}>
                <InputLabel id={label + "_InputLabel"}>{label}</InputLabel>
                <Select
                    labelId={label}
                    id={label}
                    multiple={isMultiple}
                    value={changeValue}
                    onChange={handleChange}
                    input={<OutlinedInput label={label} />}
                    renderValue={
                        isMultiple? (selected) => selected.join(', ') : (selected) => {return selected}
                    }
                    //MenuProps={MenuProps}
                >
                    {values.map((column) => (
                        <MenuItem
                            key={column.name}
                            value={column.name}
                        >
                            {isMultiple && (
                                <Checkbox checked={changeValue.indexOf(column.name) > -1} />
                            )}
                            {column.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
    }

    function getColumns(selectedID: number){
        const ocel = String(dataSource[Number(selectedID)].full_path)
        const uri: string = getURI("/logs/csv_columns", {file_path: ocel});
        fetch(uri)
            .then(res => res.json())
            .then(data => {
                if (data !== undefined || data !== null) {
                    setColumnsCSV(generateColumns(data))
                }
            })
            .catch(err => {
                console.log("Error in fetching column data ...")
            })
    }

    function getCSVData(selectedID: number){
        const ocel = String(dataSource[Number(selectedID)].full_path)
        const uri: string = getURI("/logs/csv_data", {file_path: ocel, n_columns: 10});
        fetch(uri)
            .then(res => res.json())
            .then(data => {
                if (data !== undefined || data !== null) {
                    setDataCSV(Object.values(JSON.parse(data)))
                }
            })
            .catch(err => {
                console.log("Error in fetching csv data ...")
            })
    }

    function fetchListData(){
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
        fetchListData()
        //getColumns()
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
                {
                    // TODO: propagate selections to correct position
                    // TODO: save settings for event log? if yes, also delete it when deleting log
                    csvSelected && (
                        <React.Fragment>
                            <div style={{'marginTop': '20px'}}>
                                <ReactDataGrid
                                    idProperty={"id"}
                                    theme={"blue-light"}
                                    columns={columnsCSV}
                                    dataSource={dataCSV}
                                    style={gridStyle}
                                    selected={selected}
                                    //enableSelection={true}
                                    onSelectionChange={onSelection}
                                ></ReactDataGrid>
                            </div>
                            <Stack justifyContent="center" sx={{width: '85vw'}}>
                                {generateSelect("Objects", objectTypes, columnsCSV, handleObjectTypeChange, true, setObjectTypes, "type:" )}
                                {generateSelect("Activity", activityName, columnsCSV, handleActivityNameChange, false, setActivityName, "activity" )}
                                {generateSelect("Timestamp", timestampName, columnsCSV, handleTimestampNameChange, false, setTimestampName, "timestamp" )}
                                <FormControl size="small" sx={{ m: 1, width: '80vw' }}>
                                    <InputLabel id="Separator_InputLabel">Separator</InputLabel>
                                    <Select
                                        labelId="Separator"
                                        id="Separator"
                                        value={separator}
                                        onChange={handleSeparatorChange}
                                        input={<OutlinedInput label="Separator" />}
                                        //MenuProps={MenuProps}
                                    >
                                        {separators.map((separate) => (
                                            <MenuItem
                                                key={separate}
                                                value={separate}
                                                //style={getStyles(name, personName, theme)}
                                            >
                                                {separate}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </React.Fragment>
                    )
                }


            </div>
        </div>
    );


}

interface EventLogListProps {
    switchOcelsCallback: SwitchOcelsCallback,
}
