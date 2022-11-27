import React from 'react';
import {useAsyncAPI} from "../../api";
import ReactDataGrid from '@inovua/reactdatagrid-community';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMultiply } from "@fortawesome/free-solid-svg-icons";
import {DefaultLayout} from "../DefaultLayout/DefaultLayout";

export function EventLogList(props: EventLogListProps) {

    const dfm_query = useAsyncAPI<String[][]>("/logs/available", {});

    const gridStyle = { maxHeight: "40vh", maxWidth: "50vw" }

    const columns = [
        { name: 'name', header: 'File name', defaultFlex: 8 },
        { name: 'type', header: 'Type', defaultFlex: 2 },
        { name: 'size', header: 'File size', defaultFlex: 2 },
        { name: 'extra', header: 'Uploaded', defaultFlex: 2 }
    ]

    let dataSource = []

    if (dfm_query.result !== null){
        for (let i = 0; i < dfm_query.result.length; i++){
            let file = dfm_query.result[i]
            dataSource.push(
                {
                    name: file[0].split("/")[1].split(".").slice(0, -1),
                    size: file[1] + " KB",
                    extra: file[0].split("/")[0] === "uploaded" ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faMultiply} />,
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
