import {Plugin} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

export interface FilePasteOptions {
    onFiles?: (files: readonly File[]) => void;
}

/** Vue adaptation of upstream FilePaste: delegate files to the configured uploader. */
export const FilePaste: ExtensionAuto<FilePasteOptions> = (builder, options) => {
    builder.addPlugin(() => new Plugin({
        props: {
            handleDrop: (_view, event) => handleFiles(event.dataTransfer, options?.onFiles),
            handlePaste: (_view, event) => handleFiles(event.clipboardData, options?.onFiles),
        },
    }), builder.Priority.Lowest);
};

function handleFiles(dataTransfer: DataTransfer | null, onFiles: FilePasteOptions['onFiles']): boolean {
    const files = Array.from(dataTransfer?.files ?? []);
    if (files.length === 0 || onFiles === undefined) return false;
    onFiles(files);
    return true;
}
