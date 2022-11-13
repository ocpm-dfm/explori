import React from 'react';
import './Session.css';
import {DefaultLayout} from "../DefaultLayout/DefaultLayout";

export function Session(_props: any) {
    const content = (
        "This is the page to initialize a new session."
    );

    return <DefaultLayout content={content} />
}
