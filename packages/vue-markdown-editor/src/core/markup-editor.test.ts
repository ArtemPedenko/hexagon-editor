// @vitest-environment jsdom

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {EditorView} from '@codemirror/view';

import {mountBasicMarkupEditor} from './markup-editor';

describe('mountBasicMarkupEditor', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            disconnect(): void {}
            observe(): void {}
            unobserve(): void {}
        });
        Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
        Range.prototype.getBoundingClientRect = () => new DOMRect();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.replaceChildren();
    });

    it('mounts CodeMirror, emits user changes and keeps external synchronisation silent', () => {
        const target = document.createElement('div');
        const onChange = vi.fn();
        document.body.append(target);
        const editor = mountBasicMarkupEditor({initialValue: '# Initial', onChange, target});

        expect(target.querySelector('.cm-editor')).not.toBeNull();
        expect(editor.getValue()).toBe('# Initial');

        editor.setValue('# Updated');

        expect(editor.getValue()).toBe('# Updated');
        expect(onChange).not.toHaveBeenCalled();

        const view = EditorView.findFromDOM(target);
        expect(view).not.toBeNull();
        view?.dispatch({changes: {from: view.state.doc.length, insert: '!'}});

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(editor.getValue()).toBe('# Updated!');
    });

    it('opens search, focuses the editor and safely tears down the host', () => {
        const target = document.createElement('div');
        document.body.append(target);
        const editor = mountBasicMarkupEditor({target});

        editor.focus();
        expect(target.contains(document.activeElement)).toBe(true);

        editor.openSearch();
        expect(target.querySelector('.cm-search')).not.toBeNull();

        editor.destroy();
        editor.destroy();
        editor.focus();
        editor.openSearch();
        editor.setValue('ignored');

        expect(target.childElementCount).toBe(0);
        expect(editor.getValue()).toBe('');
    });
});
