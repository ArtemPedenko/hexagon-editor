/** Upstream search state contract for Vue search controls and CodeMirror adapters. */
export interface SearchState {
    caseSensitive: boolean;
    replace: string;
    search: string;
    wholeWord: boolean;
}

export interface SearchCounter {
    current: number;
    total: number;
}
