import type {Node, ResolvedPos} from 'prosemirror-model';
import {NodeSelection, Selection, TextSelection} from 'prosemirror-state';
import type {Command, Transaction} from 'prosemirror-state';

import {GapCursorSelection, isGapCursorSelection} from './cursor';

export type SelectionDirection = 'before' | 'after';
type ArrowDirection = 'up' | 'right' | 'down' | 'left';
type GapCursorMeta = {direction: SelectionDirection};

function isTextblock(node: Node): boolean {
    return node.isTextblock && node.type.spec.code !== true;
}

function isEdgeTextblock($cursor: ResolvedPos, direction: SelectionDirection): boolean {
    const index = $cursor.index($cursor.depth - 1);
    return direction === 'before'
        ? index === 0
        : index === $cursor.node($cursor.depth - 1).childCount - 1;
}

export function findNextFakeParaPosForGapCursorSelection(
    selection: GapCursorSelection,
    direction: SelectionDirection,
): ResolvedPos | null {
    const {$pos} = selection;
    if ($pos.pos !== $pos.start() && $pos.pos !== $pos.end()) return null;
    return findFakeParaPosClosestToPos($pos, $pos.depth, direction);
}

export function findFakeParaPosForNodeSelection(
    selection: NodeSelection,
    direction: SelectionDirection,
): ResolvedPos | null {
    const selectedNode = selection.node;
    if (selectedNode.isInline || isTextblock(selectedNode)) return null;
    const {$from} = selection;
    const index = $from.index();
    const parent = $from.parent;
    if (direction === 'before') {
        return parent.firstChild === selectedNode || !isTextblock(parent.child(index - 1)) ? $from : null;
    }
    return parent.lastChild === selectedNode || !isTextblock(parent.child(index + 1)) ? selection.$to : null;
}

export function findFakeParaPosForCodeBlock(
    $cursor: ResolvedPos,
    direction: SelectionDirection,
): ResolvedPos | null {
    if ($cursor.parent.type.spec.code !== true) return null;
    const index = $cursor.index($cursor.depth - 1);
    const parent = $cursor.node($cursor.depth - 1);
    if (direction === 'before' && (index === 0 || !isTextblock(parent.child(index - 1)))) {
        return $cursor.doc.resolve($cursor.before());
    }
    if (direction === 'after' && (index === parent.childCount - 1 || !isTextblock(parent.child(index + 1)))) {
        return $cursor.doc.resolve($cursor.after());
    }
    return null;
}

export function findFakeParaPosForTextSelection(
    selection: TextSelection,
    direction: SelectionDirection,
): ResolvedPos | null {
    const $cursor = direction === 'before' ? selection.$from : selection.$to;
    if ($cursor.parent.isInline) return null;
    const codePosition = findFakeParaPosForCodeBlock($cursor, direction);
    if (codePosition !== null) return codePosition;
    if (!isEdgeTextblock($cursor, direction)) return null;
    return findFakeParaPosClosestToPos($cursor, $cursor.depth - 1, direction);
}

export function findFakeParaPosClosestToPos(
    $pos: ResolvedPos,
    initialDepth: number,
    direction: SelectionDirection,
): ResolvedPos | null {
    let depth = initialDepth + 1;
    while (--depth > 0) {
        const node = $pos.node(depth);
        const index = $pos.index(depth - 1);
        const parent = $pos.node(depth - 1);
        const isFirst = index === 0;
        const isLast = index === parent.childCount - 1;
        const complex = node.type.spec.complex === 'inner' || node.type.spec.complex === 'leaf';
        if (complex || parent.type.spec.gapcursor === false) {
            if (direction === 'before' && isFirst || direction === 'after' && isLast) continue;
            return null;
        }
        if (direction === 'before' && (isFirst || !isTextblock(parent.child(index - 1)))) {
            return $pos.doc.resolve($pos.before(depth));
        }
        if (direction === 'after' && (isLast || !isTextblock(parent.child(index + 1)))) {
            return $pos.doc.resolve($pos.after(depth));
        }
        return null;
    }
    return null;
}

export function createFakeParagraph(
    transaction: Transaction,
    $position: ResolvedPos,
    direction: SelectionDirection,
): Transaction {
    return transaction.setSelection(new GapCursorSelection<GapCursorMeta>($position, {meta: {direction}}));
}

const arrow = (arrowDirection: ArrowDirection): Command => (state, dispatch, view) => {
    const direction: SelectionDirection = arrowDirection === 'left' || arrowDirection === 'up' ? 'before' : 'after';
    const {selection} = state;
    let position: ResolvedPos | null = null;
    if (isGapCursorSelection<GapCursorMeta>(selection)) {
        if (selection.meta?.direction !== direction) return false;
        if (arrowDirection === 'up' && selection.pos === 0 || arrowDirection === 'down' && selection.pos === state.doc.nodeSize - 2) return true;
        position = findNextFakeParaPosForGapCursorSelection(selection, direction);
    } else if (selection instanceof NodeSelection) {
        position = findFakeParaPosForNodeSelection(selection, direction);
    } else if (selection instanceof TextSelection && view?.endOfTextblock(arrowDirection)) {
        position = findFakeParaPosForTextSelection(selection, direction);
    }
    if (position === null) return false;
    dispatch?.(createFakeParagraph(state.tr, position, direction).scrollIntoView());
    return true;
};

export const arrowLeft = arrow('left');
export const arrowRight = arrow('right');
export const arrowUp = arrow('up');
export const arrowDown = arrow('down');

export const gapCursorBackspace: Command = (state, dispatch) => {
    if (!isGapCursorSelection(state.selection)) return false;
    const selection = Selection.findFrom(state.selection.$pos, -1);
    if (selection === null) return false;
    dispatch?.(state.tr.setSelection(selection).scrollIntoView());
    return true;
};

function hasContentToSelect(node: Node): boolean {
    return node.isTextblock ? node.content.size > 0 : node.content.size > 0;
}

export const hierarchicalSelectAll: Command = (state, dispatch) => {
    const {selection} = state;
    const {$from, $to} = selection;
    for (let depth = $from.sharedDepth($to.pos); depth > 0; depth -= 1) {
        const node = $from.node(depth);
        const configured = node.type.spec.selectAll;
        if (configured === false) continue;
        const mode = configured ?? (node.isTextblock || node.type.spec.code ? 'content' : undefined);
        if (mode === undefined || !hasContentToSelect(node)) continue;
        const from = mode === 'node' ? $from.before(depth) : $from.start(depth);
        const to = mode === 'node' ? $from.after(depth) : $from.start(depth) + node.content.size;
        if (selection.from <= from && selection.to >= to) continue;
        dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
        return true;
    }
    return false;
};

declare module 'prosemirror-model' {
    interface NodeSpec {
        complex?: boolean | 'inner' | 'leaf' | undefined;
        gapcursor?: boolean | undefined;
        selectAll?: false | 'node' | 'content' | undefined;
    }
}
