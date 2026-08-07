// @vitest-environment jsdom

import {h} from 'vue';
import {EditorState, Plugin, TextSelection} from 'prosemirror-state';
import {DecorationSet, EditorView} from 'prosemirror-view';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {basicMarkdownCodec, basicMarkdownSchema} from './basic-editor';
import {createVueContextPanelPlugin, createVueNodeView, createVueWidgetDecoration} from './vue-renderer';

describe('Vue ProseMirror renderer', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('mounts and destroys a Vue node view', () => {
        const target = document.createElement('div');
        const component = {
            props: {node: {required: true}},
            setup: (props: {node: {attrs: {alt: string}}}) => () => h('button', {class: 'vue-node-view'}, props.node.attrs.alt),
        };
        const view = new EditorView(target, {
            nodeViews: {image: createVueNodeView(component)},
            state: EditorState.create({doc: basicMarkdownCodec.parse('![Image](https://example.com/image.png)')}),
        });

        expect(target.querySelector('.vue-node-view')?.textContent).toBe('Image');

        view.destroy();
        expect(target.querySelector('.vue-node-view')).toBeNull();
    });

    it('mounts and destroys a Vue widget decoration', () => {
        const target = document.createElement('div');
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Text')),
        ]);
        const decoration = createVueWidgetDecoration(1, {
            setup: () => () => h('span', {class: 'vue-widget'}, 'Widget'),
        });
        const plugin = new Plugin({
            props: {decorations: () => DecorationSet.create(documentNode, [decoration])},
        });
        const view = new EditorView(target, {
            state: EditorState.create({doc: documentNode, plugins: [plugin]}),
        });

        expect(target.querySelector('.vue-widget')?.textContent).toBe('Widget');

        view.destroy();
        expect(target.querySelector('.vue-widget')).toBeNull();
    });

    it('shows a Vue context panel for a text selection', () => {
        const target = document.createElement('div');
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Text')),
        ]);
        const panel = {
            props: {selectedText: {required: true}, visible: {required: true}},
            setup: (props: {selectedText: string; visible: boolean}) => () => h(
                'div',
                {class: 'vue-context-panel', 'data-visible': String(props.visible)},
                props.selectedText,
            ),
        };
        const view = new EditorView(target, {
            state: EditorState.create({
                doc: documentNode,
                plugins: [createVueContextPanelPlugin(panel)],
            }),
        });
        vi.spyOn(view, 'coordsAtPos').mockReturnValue({bottom: 20, left: 10, right: 10, top: 10});

        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 5)));

        expect(target.querySelector('.vue-context-panel')?.getAttribute('data-visible')).toBe('true');
        expect(target.querySelector('.vue-context-panel')?.textContent).toBe('Text');
        expect(target.querySelector<HTMLElement>('.markdown-editor-context-panel')?.style.left).toBe('10px');
        expect(target.querySelector<HTMLElement>('.markdown-editor-context-panel')?.style.top).toBe('20px');

        view.destroy();
        expect(target.querySelector('.vue-context-panel')).toBeNull();
    });
});
