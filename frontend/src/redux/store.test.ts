import { saveUserSession, createUserSession, modifyUserSession, restoreUserSession } from "./UserSession/userSession.actions";
import { CREATE_USER_SESSION, SAVE_USER_SESSION, RESTORE_USER_SESSION, NO_CHANGE_USER_SESSION, UPDATE_USER_SESSION } from "./UserSession/userSession.types";

export const testUserSession = (store: any) => {
    store.dispatch(restoreUserSession("uploaded/p2p-normal.jsonocel"))
    store.dispatch(restoreUserSession("uploaded/p2p.jsonocel"))

    store.dispatch(modifyUserSession({
        ocel: "uploaded/test-redux.jsonocel",
        threshold: 50,
        selectedObjectTypes: ["Object1", "Object2"],
        alreadySelectedAllObjectTypesInitially: true,
        highlightingMode: "none",
        graphHorizontal: false,
        alignmentMode: "none",
    }))

    store.dispatch(saveUserSession(store.getState().session))

}