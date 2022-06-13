
declare module 'open-file-explorer' {
    export = openExplorer;
}

declare function openExplorer(path: string, callback: (err: string) => void): void;
