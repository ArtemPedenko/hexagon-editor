import {Plugin} from 'prosemirror-state';
import {NodeSelection} from 'prosemirror-state';
import {Decoration, DecorationSet} from 'prosemirror-view';
import type {EditorView} from 'prosemirror-view';

import type {ExtensionAuto} from '../../core/extension-builder';
import {ImageAttr, imageNodeName} from '../markdown/image';

const minimumImageWidth = 40;

/** Adds a drag handle to a selected image and persists its dimensions in node attrs. */
export const Resizable: ExtensionAuto = (builder) => {
    builder.addPlugin(() => new Plugin({
        props: {
            decorations: (state) => {
                if (!(state.selection instanceof NodeSelection) || state.selection.node.type.name !== imageNodeName) return DecorationSet.empty;
                return DecorationSet.create(state.doc, [
                    Decoration.widget(state.selection.to, (view) => createResizeHandle(view), {side: -1}),
                ]);
            },
        },
    }));
};

function createResizeHandle(view: EditorView): HTMLElement {
    const handle = document.createElement('button');
    handle.className = 'markdown-editor__image-resize-handle';
    handle.type = 'button';
    handle.setAttribute('aria-label', 'Resize image');
    handle.textContent = '↘';
    const selection = view.state.selection;
    if (selection instanceof NodeSelection) {
        const image = view.nodeDOM(selection.from);
        if (image instanceof HTMLImageElement) {
            const bounds = image.getBoundingClientRect();
            handle.style.left = `${Math.max(0, bounds.right - 24)}px`;
            handle.style.top = `${Math.max(0, bounds.top + 4)}px`;
        }
    }
    handle.addEventListener('pointerdown', (event) => {
        if (!(view.state.selection instanceof NodeSelection) || view.state.selection.node.type.name !== imageNodeName) return;
        event.preventDefault();
        const selection = view.state.selection;
        const image = view.nodeDOM(selection.from);
        if (!(image instanceof HTMLImageElement)) return;
        const bounds = image.getBoundingClientRect();
        const startWidth = bounds.width;
        const startHeight = bounds.height;
        const ratio = startHeight === 0 ? 1 : startWidth / startHeight;
        const startX = event.clientX;
        handle.setPointerCapture(event.pointerId);
        const resize = (moveEvent: PointerEvent) => {
            const width = Math.max(minimumImageWidth, Math.round(startWidth + moveEvent.clientX - startX));
            image.style.width = `${width}px`;
            image.style.height = `${Math.round(width / ratio)}px`;
        };
        const finish = (upEvent: PointerEvent) => {
            handle.removeEventListener('pointermove', resize);
            handle.removeEventListener('pointerup', finish);
            const width = Math.max(minimumImageWidth, Math.round(startWidth + upEvent.clientX - startX));
            const attrs = {...selection.node.attrs, [ImageAttr.Height]: Math.round(width / ratio), [ImageAttr.Width]: width};
            const transaction = view.state.tr.setNodeMarkup(selection.from, undefined, attrs);
            view.dispatch(transaction.setSelection(NodeSelection.create(transaction.doc, selection.from)));
        };
        handle.addEventListener('pointermove', resize);
        handle.addEventListener('pointerup', finish, {once: true});
    });
    return handle;
}
