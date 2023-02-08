import React, {useEffect, useState} from 'react';
import './EventLogList.css';
import '../DefaultLayout/DefaultLayout.css';
import '@inovua/reactdatagrid-community/index.css';
import '@inovua/reactdatagrid-community/theme/blue-light.css';
import {SwitchOcelsCallback} from "../../App";
import {EventLogMetadata} from "../../redux/EventLogs/eventLogs.types";
import {RootState} from "../../redux/store";
import {ThunkDispatch} from "@reduxjs/toolkit";
import {loadEventLogs} from "../../redux/EventLogs/eventLogs.actions";
import {connect} from "react-redux";
import {EventLogTable} from "./EventLogTable/EventLogTable";
import {DeleteEventLogModal} from "./DeleteEventLogModal/DeleteEventLogModal";
import {UploadLogButton} from "./UploadLogButton/UploadLogButton";
import {CSVSettings, CSVState} from "./CSVSettings/CSVSettings";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCircleCheck} from "@fortawesome/free-solid-svg-icons";
import getUuid from "uuid-by-string";
import {getURI} from "../../hooks";


interface EventLogListProps {
    onSelect: SwitchOcelsCallback,

    selectText?: string,

    enableCSVSettings?: boolean
}

interface StateProps {
    eventLogs: EventLogMetadata[]
}

interface DispatchProps {
    loadEventLogs: () => void
}

const mapStateToProps = (state: RootState, _: EventLogListProps): StateProps => ({
    eventLogs: state.listOfEventLogs
});

const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, any>, _: EventLogListProps): DispatchProps => ({
    loadEventLogs: async () => {
        await dispatch(loadEventLogs());
    }
});

type Props = StateProps & DispatchProps & EventLogListProps;

export const EventLogList = connect<StateProps, DispatchProps, EventLogListProps, RootState>(mapStateToProps, mapDispatchToProps)(
    (props: Props) => {

        useEffect(() => {
            props.loadEventLogs();
        }, []);


        const [selected, setSelected] = useState<number | null>(null);
        const [eventLogToBeDeleted, setEventLogToBeDeleted] = useState<EventLogMetadata | null>(null);
        const [gridRef, setGridRef] = useState(null);
        const [csvSettings, setCSVSettings] = useState<CSVState | null>(null);

        let selectedEventLog = null;
        if (selected != null && selected < props.eventLogs.length)
            selectedEventLog = props.eventLogs[selected];

        const onSelection = ({selected}: { selected: any }) => {
            setSelected(selected);
        };

        // This function checks if the currently stored csv column mapping in the backend is equal to
        // the currently selected mappings. If this is not the case, we need to overwrite them.
        async function checkForChangeInCSV(): Promise<boolean>{
            try {
                if (selected !== null){
                    const uri = getURI("/logs/restore", {name: props.eventLogs[selected].full_path});
                    const response = await fetch(uri);
                    if (response.status === 200) {
                        const data: CSVState = await (await fetch(uri)).json();
                        if (
                            csvSettings !== null &&
                            (
                                data.activity !== csvSettings.activity ||
                                data.id !== csvSettings.id ||
                                data.separator !== csvSettings.separator ||
                                data.timestamp !== csvSettings.timestamp ||
                                data.objects.toString() !== csvSettings.objects.toString()
                            )
                        ) {
                            return true;
                        }
                    }
                    else if (response.status === 404) {
                        return false;
                    }
                    else
                        console.log("got an unexpected response:", response.status, await response.json())
                }

            }
            catch (e) {
                console.log("Got an unexpected error during loading CSV schema data");
                console.error(e);
            }
            return false;
        }

        // When we select a csv, we first check if the column mapping stored in the backend and the currently
        // selected one are equal. If this is not the case, we first need to delete the corresponding cache in
        // the backend, so that no wrong cached results are used but new ones are computed.
        const onSelect = () => {
            if (selected !== null) {
                if (props.eventLogs[selected].type === "csv") {
                    checkForChangeInCSV().then(function(success){
                        if (success) {
                            const ocel = String(props.eventLogs[selected].full_path);
                            const uri = getURI("/logs/delete_csv_cache", {file_path: ocel, uuid: getUuid(ocel)});
                            fetch(uri)
                                .then((response) => response.json())
                                .then((result) => {
                                    console.log("All cached data was deleted");
                                })
                                .catch(err => console.log("Error in deleting ..."));
                        }
                    })
                }

                props.onSelect(props.eventLogs[selected].full_path);
            }

        };

        const findLog = (eventLog: EventLogMetadata) => {
            for (let log of props.eventLogs){
                if (eventLog.full_path === log.full_path){
                    return log.id
                }
            }
            return -1
        }

        const csvSettingsEnabled = props.enableCSVSettings !== undefined ? props.enableCSVSettings : true;

        return (
            <div className="EventLogList">
                <DeleteEventLogModal selectedEventLog={eventLogToBeDeleted}
                                     afterDelete={async () => {
                                         setSelected(null);
                                         await props.loadEventLogs();
                                     }}
                                     onClose={() => setEventLogToBeDeleted(null)} />
                <EventLogTable eventLogs={props.eventLogs}
                               selection={selected}
                               setSelection={onSelection}
                               setGridRef={setGridRef}
                               deleteLog={(eventLog) => setEventLogToBeDeleted(eventLog)}
                />
                <div className="EventLogList-Buttons">
                    <UploadLogButton onUpload={(eventLog) => {
                        if (eventLog.id !== undefined)
                            setSelected(eventLog.id);
                            if (gridRef !== null)
                                // TypeScript says gridRef is type "never", need to fix this
                            { // @ts-ignore
                                gridRef.current.scrollToId(eventLog.id)
                            }
                        else {
                            const id = findLog(eventLog)
                            if (id !== undefined) {
                                setSelected(id);
                                if (gridRef !== null)
                                    // TypeScript says gridRef is type "never", need to fix this
                                    { // @ts-ignore
                                        gridRef.current.scrollToId(id)
                                    }
                            }

                        }
                    }
                    }/>
                    <div className="EventLogList-SelectButton" onClick={onSelect}>
                        <FontAwesomeIcon icon={faCircleCheck} />
                        {props.selectText ? props.selectText : "Select" }
                    </div>
                </div>
                { csvSettingsEnabled && <CSVSettings selectedEventLog={selectedEventLog} setCSVSettings={setCSVSettings}/> }
            </div>
        );
    });
