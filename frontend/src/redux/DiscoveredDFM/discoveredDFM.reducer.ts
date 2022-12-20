const discoveredDFMReducer = (state = [], action: Action) => {
    switch (action.type) {
        default: return state
    }
}

export default discoveredDFMReducer

interface Action {
    type: string,
    payload: {}
}