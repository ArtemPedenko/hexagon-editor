import type {NodeType} from 'prosemirror-model';
import {Plugin, TextSelection} from 'prosemirror-state';
import type {Command, EditorState, Transaction} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

export const addEmptyDefaultTextblockToStartOfDocumentActionName = 'addEmptyDefaultTextblockToStartOfDocument';
export const addEmptyDefaultTextblockToEndOfDocumentActionName = 'addEmptyDefaultTextblockToEndOfDocument';

export interface ClicksOnEdgesActionContext {
    dispatch?: (transaction: Transaction) => void;
    state: EditorState;
}

function paragraphType(state: EditorState): NodeType | undefined {
    return state.schema.nodes.paragraph;
}

function insertParagraph(position: number, state: EditorState, dispatch: ((transaction: Transaction) => void) | undefined): void {
    const paragraph = paragraphType(state);
    if (dispatch === undefined || paragraph === undefined) return;
    const transaction = state.tr.insert(position, paragraph.create());
    transaction.setSelection(TextSelection.create(transaction.doc, position + 1));
    dispatch(transaction.scrollIntoView());
}

export const addParagraphToStart: Command = (state, dispatch) => {
    const paragraph = paragraphType(state);
    if (paragraph === undefined) return false;
    if (state.doc.firstChild?.type === paragraph) {
        dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, 1)).scrollIntoView());
        return true;
    }
    insertParagraph(0, state, dispatch);
    return true;
};

export const addParagraphToEnd: Command = (state, dispatch) => {
    const paragraph = paragraphType(state);
    const {lastChild} = state.doc;
    if (paragraph === undefined || lastChild === null) return false;
    if (lastChild.type === paragraph && lastChild.nodeSize === 2) {
        dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, state.doc.nodeSize - 3)).scrollIntoView());
        return true;
    }
    insertParagraph(state.doc.nodeSize - 2, state, dispatch);
    return true;
};

function isActionContext(context: unknown): context is ClicksOnEdgesActionContext {
    return typeof context === 'object' && context !== null && 'state' in context;
}

export const ClicksOnEdges: ExtensionAuto = (builder) => {
    builder
        .addAction(addEmptyDefaultTextblockToStartOfDocumentActionName, () => ({
            isActive: () => false,
            isEnabled: (context?: unknown) => isActionContext(context) && addParagraphToStart(context.state),
            metadata: () => undefined,
            run: (context?: unknown) => {
                if (isActionContext(context)) addParagraphToStart(context.state, context.dispatch);
            },
        }))
        .addAction(addEmptyDefaultTextblockToEndOfDocumentActionName, () => ({
            isActive: () => false,
            isEnabled: (context?: unknown) => isActionContext(context) && addParagraphToEnd(context.state),
            metadata: () => undefined,
            run: (context?: unknown) => {
                if (isActionContext(context)) addParagraphToEnd(context.state, context.dispatch);
            },
        }))
        .addPlugin(() => new Plugin({
            props: {
                handleClick: (view, _position, event) => {
                    if (event.target !== view.dom) return false;
                    const {lastChild} = view.dom;
                    if (!(lastChild instanceof Element)) return false;
                    const targetRect = view.dom.getBoundingClientRect();
                    const lastOffsetBottom = lastChild.getBoundingClientRect().bottom - targetRect.y;
                    if (event.offsetY > lastOffsetBottom) return addParagraphToEnd(view.state, view.dispatch);
                    return false;
                },
            },
        }));
};
