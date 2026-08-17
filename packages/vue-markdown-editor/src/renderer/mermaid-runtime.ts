import type {Mermaid} from 'mermaid';

let diagramId = 0;
let mermaidPromise: Promise<Mermaid> | undefined;

export function getMermaid(): Promise<Mermaid> {
    mermaidPromise ??= import('mermaid').then(({default: mermaid}) => {
        mermaid.initialize({securityLevel: 'strict', startOnLoad: false});
        return mermaid;
    });
    return mermaidPromise;
}

export function nextMermaidDiagramId(): string {
    return `markdown-renderer-mermaid-${++diagramId}`;
}
