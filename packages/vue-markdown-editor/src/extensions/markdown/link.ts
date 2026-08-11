import {toggleMark} from 'prosemirror-commands';
import {InputRule} from 'prosemirror-inputrules';
import type {MarkType} from 'prosemirror-model';
import {Plugin} from 'prosemirror-state';
import {TextSelection} from 'prosemirror-state';
import type {Command, EditorState, Transaction} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

import {LinkAttr, linkMarkName, LinkSpecs} from './link-specs';

export {LinkAttr, LinkSpecs, linkMarkName, linkMarkSpec, linkTokenSpec, serializeLink} from './link-specs';

export interface LinkOptions {
    linkKey?: string | null;
}

export function getLinkType(schema: EditorState['schema']): MarkType {
    const link = schema.marks[linkMarkName];
    if (link === undefined) throw new Error('Link extension requires a link mark');
    return link;
}

export const removeLink: Command = (state, dispatch, view) => {
    const link = getLinkType(state.schema);
    return link.isInSet(state.selection.$from.marks()) === undefined
        ? false
        : toggleMark(link)(state, dispatch, view);
};

export const toggleLink =
    (href: string, title?: string): Command =>
    (state, dispatch, view) => toggleMark(getLinkType(state.schema), {[LinkAttr.Href]: href, [LinkAttr.Title]: title ?? null})(state, dispatch, view);

/** Updates an existing link, or creates one for the selected text. */
export const setLink =
    (href: string, title?: string, text?: string): Command =>
    (state, dispatch) => {
        const link = getLinkType(state.schema);
        const range = getLinkRange(state, link);
        const from = range?.from ?? state.selection.from;
        const to = range?.to ?? state.selection.to;
        const content = text ?? (state.doc.textBetween(from, to) || href);
        if (content.length === 0) return false;
        let transaction = state.tr;
        if ((range === undefined && state.selection.empty) || (text !== undefined && text !== state.doc.textBetween(from, to))) {
            transaction = transaction.insertText(content, from, to);
        }
        const end = from + content.length;
        transaction = transaction.removeMark(from, end, link).addMark(from, end, link.create({[LinkAttr.Href]: href, [LinkAttr.Title]: title ?? null}));
        dispatch?.(transaction.scrollIntoView());
        return true;
    };

export const removeCurrentLink: Command = (state, dispatch) => {
    const range = getLinkRange(state, getLinkType(state.schema));
    if (range === undefined) return false;
    dispatch?.(state.tr.removeMark(range.from, range.to, getLinkType(state.schema)).scrollIntoView());
    return true;
};

export function getCurrentLink(state: EditorState): {href: string; text: string; title: string | null} | undefined {
    const range = getLinkRange(state, getLinkType(state.schema));
    if (range === undefined) return undefined;
    return {
        href: range.mark.attrs[LinkAttr.Href] as string,
        text: state.doc.textBetween(range.from, range.to),
        title: range.mark.attrs[LinkAttr.Title] as string | null,
    };
}

export const Link: ExtensionAuto<LinkOptions> = (builder, options) => {
    builder.use(LinkSpecs);
    if (options?.linkKey !== null && options?.linkKey !== undefined) {
        builder.addKeymap(({schema}) => ({[options.linkKey!]: toggleMark(getLinkType(schema))}));
    }
    builder
        .addInputRules(({schema}) => ({rules: [linkInputRule(getLinkType(schema))]}))
        .addPlugin(() => new Plugin({
            props: {
                handlePaste: (view, event) => pasteUrlAsLink(view.state, view.dispatch, event),
            },
        }));
};

function pasteUrlAsLink(state: EditorState, dispatch: (transaction: Transaction) => void, event: ClipboardEvent): boolean {
    const href = event.clipboardData?.getData('text/plain').trim() ?? '';
    if (!isHttpUrl(href)) return false;
    event.preventDefault();
    const from = state.selection.from;
    const transaction = state.tr
        .replaceSelectionWith(state.schema.text(href))
        .addMark(from, from + href.length, getLinkType(state.schema).create({[LinkAttr.Href]: href}));
    dispatch(transaction.setSelection(TextSelection.create(transaction.doc, from + href.length)).scrollIntoView());
    return true;
}

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function getLinkRange(state: EditorState, link: MarkType): {from: number; mark: ReturnType<MarkType['create']>; to: number} | undefined {
    const {$from} = state.selection;
    if (!state.selection.empty) {
        const selectedMark = link.isInSet($from.marks()) ?? link.isInSet($from.nodeAfter?.marks ?? []);
        if (selectedMark !== undefined) return {from: state.selection.from, mark: selectedMark, to: state.selection.to};
    }
    const mark = link.isInSet($from.marks()) ?? link.isInSet($from.nodeBefore?.marks ?? []) ?? link.isInSet($from.nodeAfter?.marks ?? []);
    if (mark === undefined) return undefined;
    const parentStart = $from.start();
    const children: Array<{nodeSize: number; offset: number; marks: readonly ReturnType<MarkType['create']>[]}> = [];
    $from.parent.forEach((node, offset) => children.push({marks: node.marks, nodeSize: node.nodeSize, offset}));
    const cursor = state.selection.from;
    const index = children.findIndex(({marks, nodeSize, offset}) => parentStart + offset <= cursor && cursor <= parentStart + offset + nodeSize && mark.isInSet(marks) !== undefined);
    const currentIndex = index === -1 ? children.findIndex(({marks}) => mark.isInSet(marks) !== undefined) : index;
    if (currentIndex === -1) return undefined;
    let first = currentIndex;
    let last = currentIndex;
    while (first > 0 && mark.isInSet(children[first - 1]?.marks ?? []) !== undefined) first -= 1;
    while (last < children.length - 1 && mark.isInSet(children[last + 1]?.marks ?? []) !== undefined) last += 1;
    return {
        from: parentStart + (children[first]?.offset ?? 0),
        mark,
        to: parentStart + (children[last]?.offset ?? 0) + (children[last]?.nodeSize ?? 0),
    };
}

function linkInputRule(markType: MarkType): InputRule {
    return new InputRule(/\[(.+)]\((\S+)\)\s$/, (state, match, start, end) => {
        const input = match as RegExpMatchArray;
        if (input.index !== undefined && input.index > 0 && input.input?.[input.index - 1] !== ' ') return null;
        const alt = input[1];
        const href = input[2];
        const code = state.schema.marks.code;
        if (alt === undefined || href === undefined || (code !== undefined && state.doc.rangeHasMark(start, end, code))) return null;
        return state.tr.replaceWith(start, end, markType.schema.text(alt)).addMark(
            start,
            start + alt.length,
            markType.create({[LinkAttr.Href]: href}),
        );
    });
}
