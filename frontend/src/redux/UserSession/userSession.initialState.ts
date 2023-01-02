import {SessionState} from "./userSession.types";

const currentOcel = localStorage.getItem("explori-currentOcel") || "uploaded/p2p-normal.jsonocel";

const USER_SESSION_INITIAL_STATE = {
    ocel: currentOcel,
    threshold: 100.0,
    selectedObjectTypes: [],
    alreadySelectedAllObjectTypesInitially: false,
    highlightingMode: "none"
} as SessionState

export default USER_SESSION_INITIAL_STATE