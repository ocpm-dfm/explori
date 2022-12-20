const startAutoSavingReducer = (state = [], action: Action) => {
    switch (action.type) {
        default: return state
    }
}

export default startAutoSavingReducer

interface Action {
    type: string,
    payload: {}
}