// @vitest-environment jsdom
/* eslint-disable vue/one-component-per-file -- Tests define isolated inline components for each renderer case. */

import {createApp, defineComponent, h, inject, nextTick} from 'vue';
import type {PropType} from 'vue';
import {EditorState, Plugin, TextSelection} from 'prosemirror-state';
import {DecorationSet, EditorView} from 'prosemirror-view';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {basicMarkdownCodec, basicMarkdownSchema} from './basic-editor';
import {createVueContextPanelPlugin, createVueNodeView, createVueWidgetDecoration} from './vue-renderer';

describe('Vue ProseMirror renderer', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('passes the parent app context to node views', () => {
        const host = document.createElement('div');
        const parentApp = createApp({render: () => null});
        parentApp.provide('message', 'Provided value');
        parentApp.mount(host);
        const target = document.createElement('div');
        const component = defineComponent({
            setup: () => () => h('span', {class: 'injected-value'}, inject('message')),
        });
        const view = new EditorView(target, {
            nodeViews: {image: createVueNodeView(component, {appContext: parentApp._context})},
            state: EditorState.create({doc: basicMarkdownCodec.parse('![Image](https://example.com/image.png)')}),
        });

        expect(target.querySelector('.injected-value')?.textContent).toBe('Provided value');

        view.destroy();
        parentApp.unmount();
    });

    it('mounts and destroys a Vue node view', () => {
        const target = document.createElement('div');
        const component = defineComponent({
            props: {
                node: {
                    required: true,
                    type: Object as PropType<{attrs: {alt: string}}>,
                },
            },
            setup: (props) => () => h('button', {class: 'vue-node-view'}, props.node.attrs.alt),
        });
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

    it('passes the parent app context to widget decorations', () => {
        const host = document.createElement('div');
        const parentApp = createApp({render: () => null});
        parentApp.provide('message', 'Provided widget value');
        parentApp.mount(host);
        const target = document.createElement('div');
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Text')),
        ]);
        const decoration = createVueWidgetDecoration(1, {
            setup: () => () => h('span', {class: 'injected-widget-value'}, inject('message')),
        }, {}, {appContext: parentApp._context});
        const plugin = new Plugin({
            props: {decorations: () => DecorationSet.create(documentNode, [decoration])},
        });
        const view = new EditorView(target, {
            state: EditorState.create({doc: documentNode, plugins: [plugin]}),
        });

        expect(target.querySelector('.injected-widget-value')?.textContent).toBe('Provided widget value');

        view.destroy();
        parentApp.unmount();
    });

    it('shows a Vue context panel for a text selection', async () => {
        const target = document.createElement('div');
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Text')),
        ]);
        const panel = defineComponent({
            props: {
                selectedText: {required: true, type: String},
                visible: {required: true, type: Boolean},
            },
            setup: (props) => () => h(
                'div',
                {class: 'vue-context-panel', 'data-visible': String(props.visible)},
                props.selectedText,
            ),
        });
        const view = new EditorView(target, {
            state: EditorState.create({
                doc: documentNode,
                plugins: [createVueContextPanelPlugin(panel)],
            }),
        });
        vi.spyOn(view, 'coordsAtPos').mockReturnValue({bottom: 20, left: 10, right: 10, top: 10});

        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 5)));
        await nextTick();

        expect(document.querySelector('.vue-context-panel')?.getAttribute('data-visible')).toBe('true');
        expect(document.querySelector('.vue-context-panel')?.textContent).toBe('Text');
        expect(document.querySelector<HTMLElement>('.markdown-editor-context-panel')?.style.position).toBe('fixed');

        view.destroy();
        expect(document.querySelector('.vue-context-panel')).toBeNull();
    });

    it('passes the parent app context to context panels', () => {
        const host = document.createElement('div');
        const parentApp = createApp({render: () => null});
        parentApp.provide('message', 'Provided panel value');
        parentApp.mount(host);
        const target = document.createElement('div');
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Text')),
        ]);
        const panel = defineComponent({
            setup: () => () => h('div', {class: 'injected-panel-value'}, inject('message')),
        });
        const view = new EditorView(target, {
            state: EditorState.create({
                doc: documentNode,
                plugins: [createVueContextPanelPlugin(panel, {appContext: parentApp._context})],
            }),
        });

        expect(document.querySelector('.injected-panel-value')?.textContent).toBe('Provided panel value');

        view.destroy();
        parentApp.unmount();
    });
});
