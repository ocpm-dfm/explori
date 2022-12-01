import { useState, useEffect, useRef } from "react";
import { stat } from "fs";

export let API_BASE_URL = 'https://production.com/api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (window.webpackHotUpdate || (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test" && typeof console !== "undefined")
) {
    API_BASE_URL = 'http://localhost:8080';
}

// https://blog.bitsrc.io/polling-in-react-using-the-useinterval-custom-hook-e2bcefda4197?gi=61baa34c5745
export function useInterval(callback: () => any, delay: number | null) {
    const savedCallback = useRef<() => any>();
    useEffect(() => {
        savedCallback.current = callback
    }, [callback]);

    useEffect(() => {
        if (delay !== null) {
            async function tick() {
                if (savedCallback.current) {
                    const result = savedCallback.current();
                    if (result instanceof Promise)
                        await result;
                }
            }
            const id = setInterval(tick, delay);
            console.log("Added interval (delay" + delay + ")");
            return () => {
                console.log("Cleaned interval");
                clearInterval(id);
            };
        }
    }, [callback, delay]);
}

interface AsyncApiState<DataType> {
    preliminary: DataType | null
    result: DataType | null
    failed: boolean
}

type ApiResponse<DataType> = {
    status: "done" | "running" | "failed"
    preliminary: DataType | null
    result: DataType | null
}

export function useAsyncAPI<DataType>(endpoint: string, parameters: { [key: string]: string | number }) {
    const [state, setState] = useState<AsyncApiState<DataType>>({
        preliminary: null,
        result: null,
        failed: false
    });

    const parameters_empty = Object.keys(parameters).length === 0;

    const encoded_parameters = !parameters_empty ? Object.keys(parameters)
        .map((key) => `${key}=${encodeURIComponent(parameters[key])}`)
        .reduce((a, b) => a + "&" + b) : ''

    const uri = !parameters_empty ? API_BASE_URL + endpoint + "?" + encoded_parameters : API_BASE_URL + endpoint;

    const isDone = state.result != null || state.failed;

    const tick = async () => {
        console.log("Fetching " + uri);
        const response = await fetch(uri);
        if (response.status !== 200) {
            console.log("Failed to make request " + uri);
            console.log(response);
            setState({
                preliminary: null,
                result: null,
                failed: true
            });
            return;
        }

        const data: ApiResponse<DataType> = await response.json();
        if (data.status === "done") {
            setState({
                preliminary: null,
                result: data.result,
                failed: false
            });
        }
        else if (data.status === "running") {
            if (data.preliminary !== null) {
                setState({
                    preliminary: data.preliminary,
                    result: null,
                    failed: false
                });
            }
        }
        else if (data.status === "failed") {
            console.log("Task failed due to server related reasons. (Received 200 { status: 'failed' })")
            setState({
                preliminary: null,
                result: null,
                failed: true
            });
        }
    }

    useInterval(tick, isDone ? null : 1000);

    return {
        result: state.result,
        preliminary: state.preliminary,
        failed: state.failed
    };
}

export function getURI (endpoint: string, parameters: { [key:string]: string | number}) {

    const parameters_empty = Object.keys(parameters).length === 0;

    const encoded_parameters = !parameters_empty ? Object.keys(parameters)
        .map((key) => `${key}=${encodeURIComponent(parameters[key])}`)
        .reduce((a, b) => a + "&" + b) : ''

    return !parameters_empty ? API_BASE_URL + endpoint + "?" + encoded_parameters : API_BASE_URL + endpoint;
}