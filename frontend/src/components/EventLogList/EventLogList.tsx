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
import '@inovua/reactdatagrid-community/theme/blue-light.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMultiply } from "@fortawesome/free-solid-svg-icons";
import { TypeDataSource } from '@inovua/reactdatagrid-community/types';
import { Session } from '../Session/Session';
import {StateChangeCallback} from "../../App";

export function EventLogList(props: EventLogListProps) {
    const stateChangeCallback = props.stateChangeCallback;

    let initialDataSource: TypeDataSource = [];
    const uri = getURI("/logs/available", {});
    const [selected, setSelected] = useState(null);
    const [dataSource, setDataSource] = useState(initialDataSource);


    // @ts-ignore
    let onSelection = useCallback(({ selected }) => {
        setSelected(selected);
    }, []);

    let onSelect = () => {
        if (selected !== null) {
            const selectedData = dataSource[selected]

            stateChangeCallback({
                ocel: String(dataSource[Number(selected)].full_path)
            });
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

    useEffect(() => {
        fetch(uri)
            .then(res => res.json())
            .then(data => {
                if (data !== undefined || data !== null) {
                    const formattedData = data.map((eventLog: any, index: number) => {
                        console.log(eventLog)
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
    }, [])

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
    stateChangeCallback: StateChangeCallback,
}

/*interface EventLogListState {
} */
