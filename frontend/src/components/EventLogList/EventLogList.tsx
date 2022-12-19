import React, { useCallback, useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import './EventLogList.css';
import '../DefaultLayout/DefaultLayout.css';
import { ExploriNavbar } from "../ExploriNavbar/ExploriNavbar";
import { Link } from "react-router-dom";
import { getURI } from "../../api";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMultiply } from "@fortawesome/free-solid-svg-icons";
import { TypeDataSource } from '@inovua/reactdatagrid-community/types';
import { Session } from '../Session/Session';
import { SwitchOcelsCallback } from "../../App";
import {EventLogMetadata} from "../../redux/EventLogs/eventLogs.types";
import {RootState} from "../../redux/store";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {loadEventLogs} from "../../redux/EventLogs/eventLogs.actions";
import {connect} from "react-redux";

interface EventLogListProps {
    switchOcelsCallback: SwitchOcelsCallback,
}

interface StateProps {
    eventLogs: EventLogMetadata[]
}

interface DispatchProps {
    loadEventLogs: () => void
}

const mapStateToProps = (state: RootState, ownProps: EventLogListProps): StateProps => ({
    eventLogs: state.listOfEventLogs
});

const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, ownProps: EventLogListProps): DispatchProps => ({
    loadEventLogs: async () => {
        await dispatch(loadEventLogs());
    }
});

type Props = StateProps & DispatchProps & EventLogListProps;

export const EventLogList = connect<StateProps, DispatchProps, EventLogListProps, RootState>(mapStateToProps, mapDispatchToProps)(
    (props: Props) => {
        const switchOcelsCallback = props.switchOcelsCallback;

        let initialDataSource: TypeDataSource = [];
        const uri = getURI("/logs/available", {});
        const [selected, setSelected] = useState(null);
        // const [dataSource, setDataSource] = useState(initialDataSource);

        const dataSource = props.eventLogs;

        useEffect(() => {
            props.loadEventLogs();
        }, []);


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
            { name: 'extra', header: 'Uploaded', defaultFlex: 2 }
        ]

        const formatEventLogMetadata = (data: any) => {
            const eventLogMetadata = {
                full_path: data[0],
                name: data[0].split("/").pop().split(".").slice(0, -1),
                size: data[1] + " KB",
                dir_type: data[0].split("/")[0],
                extra: data[0].split("/")[0] === "uploaded" ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faMultiply} />,
                type: data[0].split(".").pop()
            }

            return eventLogMetadata
        }

        return (
            <div className="DefaultLayout-Container">
                <ExploriNavbar />
                <div className="EventLogList">
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
                        <Session setSelected={setSelected}/>
                        <Button component={Link} to={"/"} variant="outlined" onClick={onSelect} className="SelectButton" sx={
                            { 'top': '10px', 'margin-top': '10px', 'color': 'rgb(var(--color1))', 'border-color': 'rgb(var(--color1))' }
                        }>
                            Select
                        </Button>
                    </Stack>
                </div>
            </div>
        );
    });
