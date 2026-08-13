import type {Node as ProseMirrorNode} from 'prosemirror-model';
import {selectParentNode} from 'prosemirror-commands';
import {keydownHandler} from 'prosemirror-keymap';
import {Plugin} from 'prosemirror-state';
import type {EditorState, Selection as ProseMirrorSelection, Transaction} from 'prosemirror-state';
import {AllSelection, NodeSelection, TextSelection} from 'prosemirror-state';
import {Decoration, DecorationSet} from 'prosemirror-view';

import type {ExtensionAuto} from '../../core/extension-builder';
import {arrowDown, arrowLeft, arrowRight, arrowUp, gapCursorBackspace, hierarchicalSelectAll} from './selection-commands';

/**
 * Marks selected top-level nodes and allows opt-in direct node selection.
 * This is the non-React part of upstream Selection behavior.
 */
export const Selection: ExtensionAuto = (builder) => {
    builder.addPlugin(() => new Plugin({
        props: {
            handleKeyDown: keydownHandler({
                ArrowDown: arrowDown,
                ArrowLeft: arrowLeft,
                ArrowRight: arrowRight,
                ArrowUp: arrowUp,
                Backspace: gapCursorBackspace,
                'Mod-a': hierarchicalSelectAll,
            }),
            decorations: (state) => getDecorations(state.selection, state.doc),
            handleClickOn: (view, _pos, node, nodePos, _event, direct) => {
                if (!direct || node.type.spec.allowSelection !== true) return false;
                view.dispatch(view.state.tr.setSelection(new NodeSelection(view.state.doc.resolve(nodePos))));
                return true;
            },
        },
        view: (view) => {
            reselect(view.state, view.dispatch);
            return {
                update: (nextView) => {
                    reselect(nextView.state, nextView.dispatch);
                },
            };
        },
    }));
};

function reselect(state: EditorState, dispatch: (transaction: Transaction) => void): boolean {
    if (!(state.selection instanceof NodeSelection) || state.selection.node.type.spec.selectable !== false) {
        return false;
    }
    return selectParentNode(state, dispatch);
}

function getDecorations(selection: ProseMirrorSelection, documentNode: ProseMirrorNode): DecorationSet {
    if (selection instanceof NodeSelection) {
        return DecorationSet.create(documentNode, [
            Decoration.node(selection.from, selection.to, {class: 'pm-node-selected'}),
        ]);
    }

    if (selection instanceof TextSelection || selection instanceof AllSelection) {
        const decorations = getTopLevelNodesFromSelection(selection, documentNode).map(({node, pos}) =>
            Decoration.node(pos, pos + node.nodeSize, {class: 'pm-node-selected'}),
        );
        return DecorationSet.create(documentNode, decorations);
    }

    return DecorationSet.empty;
}

function getTopLevelNodesFromSelection(selection: ProseMirrorSelection, documentNode: ProseMirrorNode): Array<{node: ProseMirrorNode; pos: number}> {
    const nodes: Array<{node: ProseMirrorNode; pos: number}> = [];
    if (selection.empty) return nodes;

    documentNode.nodesBetween(selection.from, selection.to, (node, pos) => {
        const withinSelection = selection.from <= pos && pos + node.nodeSize <= selection.to;
        if (!node.isText && node.type.spec.selectable !== false && withinSelection) {
            nodes.push({node, pos});
            return false;
        }
        return true;
    });
    return nodes;
}

declare module 'prosemirror-model' {
    interface NodeSpec {
        allowSelection?: boolean | undefined;
    }
}
