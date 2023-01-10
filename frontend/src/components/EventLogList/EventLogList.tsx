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
import {CSVSettings} from "./CSVSettings/CSVSettings";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCircleCheck} from "@fortawesome/free-solid-svg-icons";


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

        let selectedEventLog = null;
        if (selected != null && selected < props.eventLogs.length)
            selectedEventLog = props.eventLogs[selected];

        const onSelection = ({selected}: { selected: any }) => {
            setSelected(selected);
        };

        const onSelect = () => {
            if (selected !== null)
                props.onSelect(props.eventLogs[selected].full_path);
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
                               deleteLog={(eventLog) => setEventLogToBeDeleted(eventLog)} />
                <div className="EventLogList-Buttons">
                    <UploadLogButton onUpload={(eventLog) => {
                        if (eventLog.id)
                            setSelected(eventLog.id);
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
                { csvSettingsEnabled && <CSVSettings selectedEventLog={selectedEventLog} /> }
            </div>
        );
    });
