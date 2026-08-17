/**
 * List commands and normalisation plugins ported from upstream. The Vue
 * package uses the same ProseMirror schema names, so this module deliberately preserves upstream
 * transaction semantics instead of reimplementing keyboard handlers in the
 * view layer.
 */
import {liftEmptyBlock} from 'prosemirror-commands';
import {inputRules, wrappingInputRule} from 'prosemirror-inputrules';
import {Fragment, Slice} from 'prosemirror-model';
import type {Node, NodeRange, NodeType, Schema} from 'prosemirror-model';
import {liftListItem, splitListItem, wrapInList} from 'prosemirror-schema-list';
import type {Command, EditorState, Transaction} from 'prosemirror-state';
import {NodeSelection, Plugin, Selection, TextSelection} from 'prosemirror-state';
import {liftTarget, ReplaceAroundStep} from 'prosemirror-transform';

const MAX_COLLAPSE_DEPTH = 100;

function listItemType(schema: Schema): NodeType {
    const itemType = schema.nodes.list_item;
    if (itemType === undefined) throw new Error('The editor schema must contain list_item');
    return itemType;
}

function isListNode(node: Node): boolean {
    const {schema} = node.type;
    return node.type === schema.nodes.bullet_list || node.type === schema.nodes.ordered_list;
}

function isListItemNode(node: Node): boolean {
    return node.type === node.type.schema.nodes.list_item;
}

function isInList(state: EditorState): boolean {
    const {$from} = state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
        if (isListNode($from.node(depth))) return true;
    }
    return false;
}

function getCursorAtBlockStart(state: EditorState) {
    const {selection} = state;
    return selection instanceof TextSelection && selection.$cursor !== null && selection.$cursor.parentOffset === 0
        ? selection.$cursor
        : null;
}

/** Upstream `toList`: converts the enclosing list rather than nesting a new one. */
export function toList(listType: NodeType): Command {
    return (state, dispatch) => {
        const {$from} = state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (!isListNode(node)) continue;
            if (node.type === listType) return true;
            if (dispatch !== undefined) dispatch(state.tr.setNodeMarkup($from.before(depth), listType));
            return true;
        }
        return wrapInList(listType)(state, dispatch);
    };
}

export function liftEmptyListItem(itemType: NodeType): Command {
    return (state, dispatch) => {
        const $cursor = getCursorAtBlockStart(state);
        if (
            $cursor === null ||
            $cursor.parent.content.size !== 0 ||
            $cursor.node(-1).type !== itemType ||
            $cursor.node(-1).childCount !== 1
        ) {
            return false;
        }
        return liftEmptyBlock(state, dispatch);
    };
}

/** Port of upstream `joinPrevList` for Backspace at the start of a list item. */
export const joinPrevList: Command = (state, dispatch) => {
    const $cursor = getCursorAtBlockStart(state);
    if ($cursor === null) return false;

    const index = $cursor.index(-1);
    const previous = $cursor.node(-1).maybeChild(index - 1);
    if (previous === null || !isListNode(previous)) return false;

    const textBlock = $cursor.parent;
    const documentWithTextBlock = state.schema.topNodeType.create(null, textBlock);
    const isEmptyTextBlock = textBlock.childCount === 0;
    let node = previous;
    let offset = $cursor.before() - previous.nodeSize;

    while (node.lastChild !== null) {
        const child = node.lastChild;
        const childOffset = node.content.size - child.nodeSize;
        if (child.isTextblock) {
            const position = offset + childOffset + child.nodeSize;
            const transaction = state.tr.delete($cursor.before(), $cursor.after());
            transaction.insert(position, textBlock.content);
            transaction.setSelection(TextSelection.create(transaction.doc, position));
            dispatch?.(transaction.scrollIntoView());
            return true;
        }
        if (!isListNode(child) && child.canAppend(documentWithTextBlock)) {
            const position = offset + childOffset + child.nodeSize;
            const transaction = state.tr.delete($cursor.before(), $cursor.after());
            transaction.insert(position, textBlock);
            transaction.setSelection(TextSelection.create(transaction.doc, position + 1));
            dispatch?.(transaction.scrollIntoView());
            return true;
        }
        if (child.isAtom || child.isLeaf) {
            const transaction = state.tr;
            if (isEmptyTextBlock) {
                transaction.delete($cursor.before(), $cursor.after());
                transaction.setSelection(NodeSelection.create(transaction.doc, offset + childOffset + 1));
            } else if (!isListNode(node) && node.canAppend(documentWithTextBlock)) {
                const position = offset + node.nodeSize - 1;
                transaction.insert(position, textBlock);
                transaction.setSelection(TextSelection.create(transaction.doc, position));
            } else {
                transaction.setSelection(NodeSelection.create(transaction.doc, offset + childOffset + 1));
            }
            dispatch?.(transaction.scrollIntoView());
            return true;
        }
        node = child;
        offset += childOffset + 1;
    }

    return false;
};

function sink(transaction: Transaction, range: NodeRange, itemType: NodeType): boolean {
    const before = transaction.mapping.map(range.start);
    const after = transaction.mapping.map(range.end);
    const startIndex = range.startIndex;
    const parent = range.parent;
    const nodeBefore = parent.child(startIndex - 1);
    const nestedBefore = nodeBefore.lastChild?.type === parent.type;
    const inner = Fragment.from(nestedBefore ? itemType.create() : null);
    const slice = new Slice(
        Fragment.from(itemType.create(null, Fragment.from(parent.type.create(null, inner)))),
        nestedBefore ? 3 : 1,
        0,
    );

    transaction.step(
        new ReplaceAroundStep(before - (nestedBefore ? 3 : 1), after, before, after, slice, 1, true),
    );
    return true;
}

/**
 * Upstream `sinkOnlySelectedListItem`; unlike prosemirror-schema-list's
 * command it keeps a multi-node selection structurally consistent.
 */
export function sinkOnlySelectedListItem(itemType: NodeType): Command {
    return ({tr, selection}, dispatch) => {
        const {$from, $to} = selection;
        const selectionRange = $from.blockRange(
            $to,
            (node) => node.childCount > 0 && node.firstChild?.type === itemType,
        );
        if (selectionRange === null || selectionRange.startIndex === 0) return false;

        const {end, parent, start, startIndex} = selectionRange;
        if (parent.child(startIndex - 1).type !== itemType) return false;
        if (dispatch === undefined) return true;

        let currentEnd = end - 1;
        while (currentEnd > start) {
            const selectionEnd = tr.mapping.map($to.pos);
            const $candidateEnd = tr.doc.resolve(currentEnd);
            const candidateStart = $candidateEnd.before($candidateEnd.depth);
            const $candidateStart = tr.doc.resolve(candidateStart);
            const candidateRange = $candidateStart.blockRange($candidateEnd);
            if (candidateRange?.start !== undefined) {
                const $rangeStart = tr.doc.resolve(candidateRange.start);
                if (candidateRange.start > selectionEnd && isListNode($rangeStart.parent)) {
                    currentEnd = candidateRange.start;
                    const target = liftTarget(candidateRange);
                    if (target !== null) tr.lift(candidateRange, target);
                }
            }
            currentEnd -= 1;
        }

        sink(tr, selectionRange, itemType);
        dispatch(tr.scrollIntoView());
        return true;
    };
}

export function createListsKeymap(schema: Schema): Record<string, Command> {
    const itemType = listItemType(schema);
    return {
        'Mod-[': liftListItem(itemType),
        'Mod-]': sinkOnlySelectedListItem(itemType),
        Backspace: liftEmptyListItem(itemType),
        Enter: splitListItem(itemType),
        'Shift-Tab': liftListItem(itemType),
        Tab: sinkOnlySelectedListItem(itemType),
    };
}

/** Input rules from upstream Lists, including non-default Markdown markers. */
export function createListsInputRules(schema: Schema): Plugin {
    const bulletList = schema.nodes.bullet_list;
    const orderedList = schema.nodes.ordered_list;
    if (bulletList === undefined || orderedList === undefined) {
        throw new Error('The editor schema must contain bullet_list and ordered_list');
    }
    return inputRules({
        rules: [
            wrappingInputRule(/^\s*([-+*])\s$/, bulletList, (match) => ({markup: match[1]})),
            wrappingInputRule(
                /^(\d+)([.)])\s$/,
                orderedList,
                (match) => ({markup: match[2], order: Number(match[1])}),
                (match, node) => node.childCount + Number(node.attrs.order) === Number(match[1]),
            ),
        ],
    });
}

export const mergeListsPlugin = () =>
    new Plugin({
        appendTransaction(transactions, oldState, newState) {
            if (!transactions.some((transaction) => transaction.docChanged) || (!isInList(oldState) && !isInList(newState))) {
                return null;
            }
            const {tr} = newState;
            const positions = new Map<number, Node>();
            tr.doc.descendants((node, position) => {
                if (!isListNode(node)) return true;
                const previous = positions.get(position);
                if (previous?.type === node.type) tr.join(tr.mapping.map(position));
                positions.set(position + node.nodeSize, node);
                return true;
            });
            return tr.docChanged ? tr : null;
        },
    });

function collapseListItemContent(item: Node, depth: number): Fragment | null {
    const firstChild = item.firstChild;
    if (firstChild === null || !isListNode(firstChild) || depth >= MAX_COLLAPSE_DEPTH) return null;

    let result = Fragment.empty;
    firstChild.forEach((child) => {
        const collapsed = isListItemNode(child) ? collapseListItemContent(child, depth + 1) : null;
        result = result.append(collapsed ?? Fragment.from(child));
    });
    const remaining = item.content.content.slice(1);
    if (remaining.length > 0) result = result.append(Fragment.from(item.type.create(null, remaining)));
    return result;
}

export const collapseListsPlugin = () =>
    new Plugin({
        appendTransaction(transactions, oldState, newState) {
            if (!transactions.some((transaction) => transaction.docChanged) || (!isInList(oldState) && !isInList(newState))) {
                return null;
            }
            const {tr} = newState;
            const replacements: Array<{content: Fragment; from: number; to: number}> = [];
            let skipUntil = -1;
            tr.doc.descendants((node, position) => {
                if (position < skipUntil || node.isTextblock || !isListItemNode(node)) return !node.isTextblock;
                const content = collapseListItemContent(node, 0);
                if (content === null) return true;
                replacements.push({content, from: position, to: position + node.nodeSize});
                skipUntil = position + node.nodeSize;
                return false;
            });
            for (const {content, from, to} of replacements.reverse()) tr.replaceWith(from, to, content);
            const finalReplacement = replacements.at(0);
            if (finalReplacement !== undefined) {
                const position = Math.min(finalReplacement.to, tr.doc.content.size);
                tr.setSelection(Selection.near(tr.doc.resolve(position)));
            }
            return tr.docChanged ? tr : null;
        },
    });
