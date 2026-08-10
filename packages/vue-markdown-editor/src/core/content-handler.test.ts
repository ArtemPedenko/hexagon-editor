import {EditorState, TextSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {afterEach, describe, expect, it} from 'vitest';

import {basicMarkdownCodec} from './basic-editor';
import {WysiwygContentHandler} from './content-handler';

const views: EditorView[] = [];

function createView(markdown: string): EditorView {
    const view = new EditorView(document.createElement('div'), {
        state: EditorState.create({doc: basicMarkdownCodec.parse(markdown)}),
    });
    views.push(view);
    return view;
}

afterEach(() => {
    while (views.length > 0) views.pop()?.destroy();
});

describe('WysiwygContentHandler', () => {
    it('replaces and appends Markdown while keeping a trailing paragraph', () => {
        const view = createView('first');
        const handler = new WysiwygContentHandler(view, basicMarkdownCodec);

        handler.replace('replaced');
        handler.append('appended');

        expect(basicMarkdownCodec.serialize(view.state.doc)).toBe('replaced\n\nappended');
        expect(view.state.doc.lastChild?.type.name).toBe('paragraph');
        expect(view.state.doc.lastChild?.content.size).toBe(0);
    });

    it('inserts Markdown at a selection and plain text in a code block', () => {
        const view = createView('hello world');
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 7, 12)));
        const handler = new WysiwygContentHandler(view, basicMarkdownCodec);

        handler.insert('there');
        expect(view.state.doc.textContent).toBe('hello there');

        const codeView = createView('```\nexisting code\n```');
        codeView.dispatch(codeView.state.tr.setSelection(TextSelection.create(codeView.state.doc, 9)));
        new WysiwygContentHandler(codeView, basicMarkdownCodec).insert('![](image.png)');
        expect(codeView.state.doc.firstChild?.textContent).toContain('![](image.png)');
    });

    it('clears the document and moves the cursor', () => {
        const view = createView('content');
        const handler = new WysiwygContentHandler(view, basicMarkdownCodec);

        handler.moveCursor('start');
        expect(view.state.selection.from).toBe(1);
        handler.clear();
        expect(view.state.doc.childCount).toBe(1);
        expect(view.state.doc.firstChild?.content.size).toBe(0);
    });
});
