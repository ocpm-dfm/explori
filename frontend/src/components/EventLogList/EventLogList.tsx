import React, {useCallback, useState} from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import './EventLogList.css';
import '../DefaultLayout/DefaultLayout.css';
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";
import {Link} from "react-router-dom";
import {getURI} from "../../api";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMultiply } from "@fortawesome/free-solid-svg-icons";
import {useQuery} from "react-query";
import { TypeDataSource } from '@inovua/reactdatagrid-community/types';

export function EventLogList(props: EventLogListProps) {

    const [selected, setSelected] = useState(null);

    // @ts-ignore
    let onSelection = useCallback(({selected}) => {
        setSelected(selected);
    }, []);

    let onSelect = () => {
        if (selected !== null) {
            const selectedData = dataSource[selected]
            // @ts-ignore
            console.log(selectedData.full_path);
        }
    };

    let compare = ( a: { dir_type: string; }, b: { dir_type: string; } ) => {
        if ( a.dir_type < b.dir_type ){
            return 1;
        }
        if ( a.dir_type > b.dir_type ){
            return -1;
        }
        return 0;
    }

    const uri = getURI("/logs/available", {});

    const {isLoading, error, data} = useQuery('TBD', () =>
        fetch(uri).then(res =>
            res.json()
        )
    )

    if (isLoading) console.log('Loading...')

    if (error) {
        console.log('An error has occurred: ' + error)
    }

    const gridStyle = {maxHeight: "70vh", maxWidth: "70vw"}

    const columns = [
        {name: 'name', header: 'File name', defaultFlex: 8},
        {name: 'type', header: 'Type', defaultFlex: 2},
        {name: 'size', header: 'File size', defaultFlex: 2},
        {name: 'extra', header: 'Uploaded', defaultFlex: 2}
    ]

    let dataSource: TypeDataSource = []

    if (data !== undefined && data !== null){
        for (let i = 0; i < data.length; i++){
            let file = data[i]
            dataSource.push(
                {
                    full_path: file[0],
                    name: file[0].split("/").pop().split(".").slice(0, -1),
                    size: file[1] + " KB",
                    dir_type: file[0].split("/")[0],
                    extra: file[0].split("/")[0] === "uploaded" ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faMultiply} />,
                    type: file[0].split(".").pop()
                })
        }
        // Let uploaded event logs appear at the top, by default mounted appear at top
        dataSource.sort(compare);
        // Give items an id for selection, we get a wrong id if we assign it in the push already
        for (let i = 0; i < data.length; i++){
            dataSource[i].id = i;
        }
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
                <Stack spacing={3} direction="row" justifyContent="flex-end">
                    <Button variant="contained" className="UploadButton" sx={
                        {'margin-top': '10px', 'background-color': 'rgb(var(--color1))'}
                    }>
                        Upload
                    </Button>
                    <Button component={Link} to={"/"} state={{ocel: String(dataSource[Number(selected)]?.full_path)}} variant="outlined" onClick={onSelect} className="SelectButton" sx={
                        {'margin-top': '10px', 'color': 'rgb(var(--color1))', 'border-color': 'rgb(var(--color1))'}
                    }>
                        Select
                    </Button>
                </Stack>
            </div>
        </div>
    );


}


interface EventLogListProps {

}

/*interface EventLogListState {
} */
