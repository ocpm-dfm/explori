export type AlignElement = {
    activity: string
};

export type TraceAlignment = {
    log_alignment: AlignElement[],
    model_alignment: AlignElement[],
}

export type TraceAlignments = {[key: string]: TraceAlignment | null}[]