import type {Node} from 'prosemirror-model';
import {InputRule} from 'prosemirror-inputrules';
import {EditorState, Plugin, PluginKey, TextSelection} from 'prosemirror-state';
import type {Command} from 'prosemirror-state';
import {Decoration, DecorationSet} from 'prosemirror-view';

import type {ExtensionAuto} from '../../core/extension-builder';

export interface FoldingHeadingActionContext {
    dispatch?: Parameters<Command>[1];
    state: EditorState;
}

const foldingPluginKey = new PluginKey<DecorationSet>('folding-heading');
const FOLDING_GUTTER_WIDTH = 24;

function isFoldingHeading(node: Node): boolean {
    return node.type.name === 'heading' && typeof node.attrs.folding === 'boolean';
}

function headingLevel(node: Node): number {
    return Number(node.attrs.level);
}

function needsTrailingParagraph(state: EditorState, position: number, level: number): boolean {
    const $heading = state.doc.resolve(position + 1);
    const next = $heading.node(-1).maybeChild($heading.indexAfter(-1));
    return next === null || (isFoldingHeading(next) && headingLevel(next) <= level);
}

function insertTrailingParagraph(state: EditorState, position: number, level: number) {
    const paragraph = state.schema.nodes.paragraph;
    if (paragraph === undefined || !needsTrailingParagraph(state, position, level)) return state.tr;
    const $heading = state.doc.resolve(position + 1);
    return state.tr.insert($heading.after(), paragraph.create());
}

export const toggleFoldingHeading: Command = (state, dispatch) => {
    const {$from} = state.selection;
    if ($from.parent.type.name !== 'heading') return false;
    if (dispatch !== undefined) {
        const position = $from.before();
        const folding = $from.parent.attrs.folding;
        const transaction = folding === null
            ? insertTrailingParagraph(state, position, headingLevel($from.parent)).setNodeMarkup(position, undefined, {...$from.parent.attrs, folding: false})
            : state.tr.setNodeMarkup(position, undefined, {...$from.parent.attrs, folding: !folding});
        dispatch(transaction.scrollIntoView());
    }
    return true;
};

export const removeFoldingAtHeadingStart: Command = (state, dispatch) => {
    const cursor = state.selection.$cursor;
    if (cursor === null || cursor === undefined || cursor.parentOffset !== 0 || cursor.parent.type.name !== 'heading' || cursor.parent.attrs.folding === null) return false;
    dispatch?.(state.tr.setNodeMarkup(cursor.before(), undefined, {...cursor.parent.attrs, folding: null}).scrollIntoView());
    return true;
};

export const openHeadingAndCreateParagraphAfter: Command = (state, dispatch) => {
    const cursor = state.selection.$cursor;
    if (cursor === null || cursor === undefined || cursor.parent.type.name !== 'heading' || cursor.parent.attrs.folding === null || cursor.parentOffset !== cursor.parent.content.size) return false;
    const next = cursor.node(1).maybeChild(cursor.indexAfter(1));
    if (next !== null && next.type.name !== 'heading') return false;
    const paragraph = state.schema.nodes.paragraph;
    if (paragraph === undefined) return false;
    const position = cursor.after();
    const transaction = state.tr.insert(position, paragraph.create());
    transaction.setSelection(TextSelection.create(transaction.doc, position + 1));
    dispatch?.(transaction.scrollIntoView());
    return true;
};

function decorations(document: Node): DecorationSet {
    const result: Decoration[] = [];
    let foldedLevel: number | undefined;
    let sectionLevel: number | undefined;
    document.forEach((node, offset) => {
        if (node.type.name === 'heading') {
            const level = Number(node.attrs.level);
            if (foldedLevel !== undefined && level <= foldedLevel) foldedLevel = undefined;
            if (node.attrs.folding === true) foldedLevel = level;
            if (isFoldingHeading(node) && node.attrs.folding === false) sectionLevel = level;
            if (node.attrs.folding !== null) {
                result.push(Decoration.node(offset, offset + node.nodeSize, {
                    class: node.attrs.folding === true
                        ? 'markdown-editor__folding-heading markdown-editor__folding-heading--folded'
                        : 'markdown-editor__folding-heading',
                }));
            }
        } else if (foldedLevel !== undefined) {
            result.push(Decoration.node(offset, offset + node.nodeSize, {class: 'markdown-editor__folded-content'}));
        } else if (sectionLevel !== undefined) {
            result.push(Decoration.node(offset, offset + node.nodeSize, {
                class: 'markdown-editor__folding-content',
                'data-folding-level': `h${sectionLevel}`,
            }));
        }
    });
    return DecorationSet.create(document, result);
}

function foldingHeadingRule(state: EditorState, match: RegExpMatchArray, start: number, end: number) {
    const heading = state.schema.nodes.heading;
    if (heading === undefined) return null;
    const $start = state.doc.resolve(start);
    if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), heading)) return null;
    const level = match[1]?.length ?? 1;
    const position = $start.before();
    const transaction = state.tr.delete(start, end);
    if ($start.parent.type !== heading) transaction.setNodeMarkup(position, heading);
    transaction.setNodeMarkup(position, undefined, {...$start.parent.attrs, folding: false, level});
    if (needsTrailingParagraph(state, position, level)) {
        const $heading = transaction.doc.resolve(transaction.mapping.map(position) + 1);
        const paragraph = state.schema.nodes.paragraph;
        if (paragraph !== undefined) transaction.insert($heading.after(), paragraph.create());
    }
    return transaction;
}

export const FoldingHeading: ExtensionAuto = (builder) => {
    builder
        .addAction('toggleHeadingFolding', () => ({
            isActive: (context?: unknown) => isFoldingHeadingActionContext(context) && context.state.selection.$from.parent.attrs.folding !== null,
            isEnabled: (context?: unknown) => isFoldingHeadingActionContext(context) && toggleFoldingHeading(context.state),
            metadata: () => undefined,
            run: (context?: unknown) => {
                if (isFoldingHeadingActionContext(context)) toggleFoldingHeading(context.state, context.dispatch);
            },
        }))
        .addInputRules(() => ({rules: [new InputRule(/^(#{1,6})\+\s$/, foldingHeadingRule)]}))
        .addKeymap(() => ({Backspace: removeFoldingAtHeadingStart, Enter: openHeadingAndCreateParagraphAfter}), builder.Priority.High)
        .addPlugin(() => new Plugin({
            key: foldingPluginKey,
            props: {
                decorations: (state) => foldingPluginKey.getState(state) ?? DecorationSet.empty,
                handleClickOn: (view, _position, node, nodePosition, event, direct) => {
                    if (!direct || !isFoldingHeading(node)) return false;
                    const target = event.target;
                    if (!(target instanceof HTMLElement) || event.offsetX >= Number.parseInt(getComputedStyle(target).paddingLeft, 10) || event.offsetX >= FOLDING_GUTTER_WIDTH) return false;
                    const $position = view.state.doc.resolve(nodePosition + 1);
                    if ($position.parent.type.name !== 'heading') return false;
                    return toggleFoldingHeading(view.state, view.dispatch);
                },
            },
            state: {
                apply: (transaction, previous) => transaction.docChanged ? decorations(transaction.doc) : previous.map(transaction.mapping, transaction.doc),
                init: (_config, state) => decorations(state.doc),
            },
        }));
};

function isFoldingHeadingActionContext(value: unknown): value is FoldingHeadingActionContext {
    return typeof value === 'object' && value !== null && 'state' in value && value.state instanceof EditorState;
}
