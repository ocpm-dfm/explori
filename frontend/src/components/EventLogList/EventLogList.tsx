import React from 'react';
import {getURI} from "../../api";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMultiply } from "@fortawesome/free-solid-svg-icons";
import {DefaultLayout} from "../DefaultLayout/DefaultLayout";
import {useQuery} from "react-query";

export function EventLogList(props: EventLogListProps) {

    const uri = getURI("/logs/available", {});

    const { isLoading, error, data } = useQuery('TBD', () =>
        fetch(uri).then(res =>
            res.json()
        )
    )

    if (isLoading) console.log('Loading...')

    if (error) {
        console.log('An error has occurred: ' + error)
    }

    const gridStyle = { maxHeight: "40vh", maxWidth: "50vw" }

    const columns = [
        { name: 'name', header: 'File name', defaultFlex: 8 },
        { name: 'type', header: 'Type', defaultFlex: 2 },
        { name: 'size', header: 'File size', defaultFlex: 2 },
        { name: 'extra', header: 'Mounted', defaultFlex: 2 }
    ]

    let dataSource = []

    if (data !== undefined && data !== null){
        for (let i = 0; i < data.length; i++){
            let file = data[i]
            dataSource.push(
                {
                    name: file[0].split("/")[1].split(".").slice(0, -1),
                    size: file[1] + " KB",
                    extra: file[0].split("/")[0] === "mounted" ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faMultiply} />,
                    type: file[0].split(".").pop()
                })
        }
    }
    const content = (
        <div className="EventLogList">
            <ReactDataGrid
                theme={"blue-light"}
                idProperty={"id"}
                columns={columns}
                dataSource={dataSource}
                style={gridStyle}
            ></ReactDataGrid>
        </div>
    );

    /*return (
        <div className="EventLogList">
            <ReactDataGrid
                theme={"blue-light"}
                idProperty={"id"}
                columns={columns}
                dataSource={dataSource}
                style={gridStyle}
            ></ReactDataGrid>
        </div>
       ); */

    return <DefaultLayout content={content} />
}


interface EventLogListProps {

}

/*interface EventLogListState {
} */
