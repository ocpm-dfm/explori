import {EventLogMetadata} from "../../../redux/EventLogs/eventLogs.types";
import React, {ReactElement, useMemo} from "react";
import ReactDataGrid from "@inovua/reactdatagrid-community";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCloudArrowUp, faHardDrive, faTrash, faEraser} from "@fortawesome/free-solid-svg-icons";

import './EventLogTable.css';

type EventLogTableProps = {
    eventLogs: EventLogMetadata[],
    selection: number | null,
    setSelection: ({selected}: { selected: any }) => void,
    deleteLog: (eventLog: EventLogMetadata) => void,
    setGridRef: any,
}

type TableEventLog = {
    id: number,
    displayName: any,
    type: ReactElement,
    size: ReactElement,
    deleteButton: any
}

export const EventLogTable = (props: EventLogTableProps) => {
    const tableLogs = useMemo(() => {
        return props.eventLogs.map((eventLog): TableEventLog => {
            const baseFolder = eventLog.full_path.split("/")[0];
            const isUploaded = baseFolder === "uploaded";
            const icon = isUploaded ?
                <FontAwesomeIcon icon={faCloudArrowUp} title="This OCEL was uploaded via the web interface"
                                 className="EventLogTable-LogSourceIcon"/> :
                <FontAwesomeIcon icon={faHardDrive} title="This OCEL was provided using a folder mount"
                                 className="EventLogTable-LogSourceIcon"/>;

            const displayName = <div title={eventLog.name}>
                {icon} {eventLog.name}
            </div>

            const deleteButton = (
                <button className="EventLogTable-DeleteButton"
                        onClick={(event) => {
                            props.deleteLog(eventLog);
                            event.stopPropagation();
                        }}
                        title={"Shows prompt for deletion of this uploaded OCEL."}
                >
                    <FontAwesomeIcon icon={faTrash}/>
                </button>)

            const clearCacheButton = (
                <button className="EventLogTable-DeleteButton"
                        onClick={(event) => {
                            props.deleteLog(eventLog);
                            event.stopPropagation();
                        }}
                        title={"Shows prompt for clearing cache of this mounted OCEL."}
                >
                    <FontAwesomeIcon icon={faEraser}/>
                </button>
            )

            return {
                id: eventLog.id!,
                displayName,
                type: <div title={eventLog.type}>{eventLog.type}</div>,
                size: <div title={eventLog.size}>{eventLog.size}</div>,
                deleteButton: isUploaded ? deleteButton : clearCacheButton
            }
        });
    }, [props.eventLogs])

    const gridStyle = {width: "100%"};

    const columns = [
        {name: 'displayName', header: 'OCEL', defaultFlex: 8},
        {name: 'type', header: 'Type', defaultFlex: 1},
        {name: 'size', header: 'File size', defaultFlex: 1},
        {name: 'deleteButton', header: '', defaultFlex: .25},
        // {name: 'extra', header: 'Uploaded', defaultFlex: 2},
    ]

    return (
        <ReactDataGrid
            idProperty={"id"}
            theme={"blue-light"}
            columns={columns}
            dataSource={tableLogs}
            onReady={props.setGridRef}
            style={gridStyle}
            selected={props.selection}
            //enableSelection={true}
            onSelectionChange={props.setSelection} />
    )
}