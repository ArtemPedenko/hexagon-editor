import {EditorState} from 'prosemirror-state';
import {describe, expect, it, vi} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';
import {FilePaste} from './file-paste';

describe('FilePaste extension', () => {
    it('consumes a paste that contains files and delegates them to the uploader', () => {
        const onFiles = vi.fn();
        const [plugin] = ExtensionsManager.plugins((builder) => builder.use(FilePaste, {onFiles}), basicMarkdownSchema);
        const state = EditorState.create({plugins: [plugin!], schema: basicMarkdownSchema});
        const file = new File(['content'], 'example.txt');
        const handled = plugin?.props.handlePaste?.({state} as never, {clipboardData: {files: [file]}} as ClipboardEvent, false);

        expect(handled).toBe(true);
        expect(onFiles).toHaveBeenCalledWith([file]);
    });
});
