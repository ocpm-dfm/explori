import { getURI } from "../../hooks";
import { EventLogMetadata } from "./eventLogs.types";

export let compare = (a: { dir_type: string; }, b: { dir_type: string; }) => {
    if (a.dir_type < b.dir_type) {
        return 1;
    }
    if (a.dir_type > b.dir_type) {
        return -1;
    }
    return 0;
}

export const formatEventLogMetadata = (data: any): EventLogMetadata => {
    return {
        full_path: data[0],
        name: data[0].split("/").pop().split(".").slice(0, -1),
        size: data[1] + " KB",
        dir_type: data[0].split("/")[0],
        extra: data[0].split("/")[0],
        type: data[0].split(".").pop()
    }
}

export const fetchEventLogs = async (): Promise<EventLogMetadata[]> => {

    const uri = getURI("/logs/available", {});
    const data = await (await fetch(uri)).json()
    if (data) {
        const formattedData = data.map((eventLog: any, index: number) => {
            const eventLogMetadata = formatEventLogMetadata(eventLog)
            return {
                ...eventLogMetadata,
                id: index
            }
        })

        formattedData.sort(compare)

        // Give items correct id for selection, we get a wrong id if we assign it in the data.map already
        for (let i = 0; i < formattedData.length; i++) {
            formattedData[i].id = i;
        }

        return formattedData
    }
    else
        return []
}
