import {describe, expect, it, vi} from 'vitest';
import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';

import {ExtensionBuilder} from '../../core/extension-builder';
import {basicMarkdownSchema} from '../../core/basic-editor';
import {EditorModeKeymap} from './editor-mode-keymap';

describe('EditorModeKeymap', () => {
    it('runs submit and cancel callbacks and consumes ignored keys', () => {
        const onCancel = vi.fn(() => true);
        const onSubmit = vi.fn(() => true);
        const builder = new ExtensionBuilder();
        builder.use(EditorModeKeymap, {ignoreKeysList: ['Tab'], onCancel, onSubmit});
        const plugins = builder.build().plugins({schema: basicMarkdownSchema});
        const target = document.createElement('div');
        const view = new EditorView(target, {state: EditorState.create({schema: basicMarkdownSchema, plugins})});

        expect(plugins).toHaveLength(2);
        expect(plugins[0]?.props.handleKeyDown?.(view, new KeyboardEvent('keydown', {key: 'Escape'}))).toBe(true);
        expect(plugins[0]?.props.handleKeyDown?.(view, new KeyboardEvent('keydown', {ctrlKey: true, key: 'Enter'}))).toBe(true);
        expect(plugins[1]?.props.handleKeyDown?.(view, new KeyboardEvent('keydown', {key: 'Tab'}))).toBe(true);
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onSubmit).toHaveBeenCalledOnce();
        view.destroy();
    });
});
