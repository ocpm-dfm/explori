import { getURI } from "../../api";

let compare = (a: { dir_type: string; }, b: { dir_type: string; }) => {
    if (a.dir_type < b.dir_type) {
        return 1;
    }
    if (a.dir_type > b.dir_type) {
        return -1;
    }
    return 0;
}

export const formatEventLogMetadata = (data: any) => {
    const eventLogMetadata = {
        full_path: data[0],
        name: data[0].split("/").pop().split(".").slice(0, -1),
        size: data[1] + " KB",
        dir_type: data[0].split("/")[0],
        extra: data[0].split("/")[0],
        type: data[0].split(".").pop()
    }

    return eventLogMetadata
}

export const fetchEventLogs = (): [] => {

    const uri = getURI("/logs/available", {});
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
                for (let i = 0; i < formattedData.length; i++) {
                    formattedData[i].id = i;
                }

                return formattedData
            }
        })
        .catch(err => {
            console.log("Error in loading ...")
        })
    return []
}