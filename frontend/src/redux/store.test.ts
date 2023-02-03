import { saveUserSession, createUserSession, modifyUserSession, restoreUserSession } from "./UserSession/userSession.actions";
import { CREATE_USER_SESSION, SAVE_USER_SESSION, RESTORE_USER_SESSION, NO_CHANGE_USER_SESSION, UPDATE_USER_SESSION } from "./UserSession/userSession.types";
import {render, screen} from "@testing-library/react";
import React from "react";
import store from "./store";

export const testUserSession = (store: any) => {
    store.dispatch(restoreUserSession("uploaded/demo_ocel.jsonocel"))
    store.dispatch(restoreUserSession("uploaded/p2p.jsonocel"))

    store.dispatch(modifyUserSession({
        ocel: "uploaded/test-redux.jsonocel",
        threshold: 50,
        selectedObjectTypes: ["Object1", "Object2"],
        alreadySelectedAllObjectTypesInitially: true,
        highlightingMode: "none",
        graphHorizontal: false,
        alignmentMode: "none",
        legendPosition: "none",
        edgeLabelMode: {
            metric: "count",
            aggregate: "sum"
        },
    }))

    store.dispatch(saveUserSession(store.getState().session))
}
