const currentOcel = localStorage.getItem("explori-currentOcel") || "uploaded/p2p-normal.jsonocel";

const USER_SESSION_INITIAL_STATE = {
    currentSelected: currentOcel,
    threshold: 100.0,
    selectedObjectTypes: [],
    alreadySelectedAllObjectTypesInitially: false
}

export default USER_SESSION_INITIAL_STATE