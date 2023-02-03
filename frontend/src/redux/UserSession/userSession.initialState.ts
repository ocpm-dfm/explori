import {SessionState} from "./userSession.types";

const currentOcel = localStorage.getItem("explori-currentOcel") || "uploaded/demo_ocel.jsonocel";

const USER_SESSION_INITIAL_STATE = {
    ocel: currentOcel,
    threshold: 100.0,
    selectedObjectTypes: [],
    alreadySelectedAllObjectTypesInitially: false,
    highlightingMode: "none",
    graphHorizontal: false,
    alignmentMode: "none",
    legendPosition: "top-left",
    edgeLabelMode: {
        metric: "count",
        aggregate: "sum"
    }
} as SessionState

export default USER_SESSION_INITIAL_STATE