/* eslint-disable vue/one-component-per-file -- Independent ProseMirror mounts each need a Vue render root. */
import {createApp, h, reactive} from 'vue';
import type {App, Component} from 'vue';
import {autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom';
import {Plugin} from 'prosemirror-state';
import type {EditorState} from 'prosemirror-state';
import type {Node as ProseMirrorNode} from 'prosemirror-model';
import {Decoration} from 'prosemirror-view';
import type {NodeView, NodeViewConstructor} from 'prosemirror-view';

export interface VueNodeViewProps {
    getPos: () => number | undefined;
    node: ProseMirrorNode;
    selected: boolean;
}

export interface VueNodeViewOptions {
    contentDOM?: boolean;
    element?: keyof HTMLElementTagNameMap;
    stopEvent?(event: Event): boolean;
}

export interface VueWidgetDecorationOptions {
    key?: string;
    side?: number;
}

export interface VueContextPanelProps {
    from: number;
    left: number;
    selectedText: string;
    top: number;
    visible: boolean;
}

export interface VueContextPanelOptions {
    className?: string;
    props?: Record<string, unknown>;
    shouldShow?(state: EditorState): boolean;
}

/** Mounts a Vue component as a ProseMirror node view with an aligned lifecycle. */
export function createVueNodeView(
    component: Component,
    options: VueNodeViewOptions = {},
): NodeViewConstructor {
    return (node, _view, getPos): NodeView => {
        const dom = document.createElement(options.element ?? 'div');
        const mountTarget = document.createElement('div');
        const state = reactive<VueNodeViewProps>({getPos, node, selected: false});
        dom.append(mountTarget);
        const app = createApp({render: () => h(component, state)});
        app.mount(mountTarget);

        const contentDOM = options.contentDOM ? document.createElement('div') : undefined;
        if (contentDOM !== undefined) {
            dom.append(contentDOM);
        }

        return {
            contentDOM,
            deselectNode: () => {
                state.selected = false;
            },
            destroy: () => {
                app.unmount();
                dom.remove();
            },
            dom,
            selectNode: () => {
                state.selected = true;
            },
            stopEvent: options.stopEvent,
            update: (nextNode) => {
                if (nextNode.type !== state.node.type) {
                    return false;
                }
                state.node = nextNode;
                return true;
            },
        };
    };
}

/** Creates a ProseMirror widget whose Vue application unmounts with the decoration. */
export function createVueWidgetDecoration(
    position: number,
    component: Component,
    props: Record<string, unknown> = {},
    options: VueWidgetDecorationOptions = {},
): Decoration {
    let app: App | undefined;

    return Decoration.widget(
        position,
        () => {
            const dom = document.createElement('span');
            app = createApp({render: () => h(component, props)});
            app.mount(dom);
            return dom;
        },
        {
            destroy: () => {
                app?.unmount();
                app = undefined;
            },
            key: options.key,
            side: options.side,
        },
    );
}

/** Shows a Vue panel next to a non-empty ProseMirror selection. */
export function createVueContextPanelPlugin(
    component: Component,
    options: VueContextPanelOptions = {},
): Plugin {
    return new Plugin({
        view: (editorView) => {
            const dom = document.createElement('div');
            dom.className = options.className ?? 'markdown-editor-context-panel';
            dom.style.position = 'fixed';
            const state = reactive({
                ...options.props,
                from: 0,
                left: 0,
                selectedText: '',
                top: 0,
                visible: false,
            });
            const app = createApp({render: () => h(component, state)});
            document.body.append(dom);
            app.mount(dom);

            const updatePosition = async (): Promise<void> => {
                const coords = editorView.coordsAtPos(editorView.state.selection.from);
                const {x, y} = await computePosition({
                    getBoundingClientRect: () => new DOMRect(coords.left, coords.bottom, 0, 0),
                }, dom, {
                    middleware: [offset(6), flip({padding: 8}), shift({padding: 8})],
                    placement: 'bottom-start',
                    strategy: 'fixed',
                });
                dom.style.left = `${x}px`;
                dom.style.top = `${y}px`;
            };
            const stopAutoUpdate = autoUpdate(editorView.dom, dom, updatePosition);

            const update = () => {
                const {from, to, empty} = editorView.state.selection;
                state.visible = !empty && (options.shouldShow?.(editorView.state) ?? true);
                if (!state.visible) {
                    dom.style.display = 'none';
                    return;
                }

                const coords = editorView.coordsAtPos(from);
                state.from = from;
                state.left = coords.left;
                state.selectedText = editorView.state.doc.textBetween(from, to, ' ');
                state.top = coords.bottom;
                dom.style.display = '';
                updatePosition();
            };

            update();
            return {
                destroy: () => {
                    stopAutoUpdate();
                    app.unmount();
                    dom.remove();
                },
                update,
            };
        },
    });
}
