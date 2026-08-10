import {toggleMark} from 'prosemirror-commands';
import {InputRule} from 'prosemirror-inputrules';
import type {Mark, MarkType} from 'prosemirror-model';
import type {Command, EditorState} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

import {BoldSpecs, boldMarkName} from './bold-specs';

export {BoldAttrs, BoldSpecs, boldMarkName, boldMarkSpec, boldTokenSpec, serializeBold} from './bold-specs';

export interface BoldOptions {
    boldKey?: string | null;
}

export function getBoldType(schema: Parameters<Command>[0]['schema']): MarkType {
    const bold = schema.marks[boldMarkName];
    if (bold === undefined) throw new Error('Bold extension requires a strong mark');
    return bold;
}

export const toggleBold: Command = (state, dispatch, view) => toggleMark(getBoldType(state.schema))(state, dispatch, view);

export const Bold: ExtensionAuto<BoldOptions> = (builder, options) => {
    builder.use(BoldSpecs);
    if (options?.boldKey !== null && options?.boldKey !== undefined) {
        builder.addKeymap(({schema}) => ({[options.boldKey!]: toggleMark(getBoldType(schema))}));
    }
    builder.addInputRules(({schema}) => ({
        rules: [
            createMarkdownMarkInputRule({close: '**', ignoreBetween: '*', open: '**'}, getBoldType(schema)),
            createMarkdownMarkInputRule({close: '__', ignoreBetween: '_', open: '__'}, getBoldType(schema)),
        ],
    }));
};

export function createMarkdownMarkInputRule(rule: {close: string; ignoreBetween?: string; open: string}, markType: MarkType): InputRule {
    const open = escapeRegex(rule.open);
    const close = escapeRegex(rule.close);
    const ignored = escapeRegex(rule.ignoreBetween ?? '');
    const expression = new RegExp(`(?:${open})${ignored ? `([^\\s${ignored}]+)` : '([\\S]+)'}(?:${close})\\s$`);
    return new InputRule(expression, (state, match, start, end) => {
        const input = match as RegExpMatchArray;
        if (input.index !== undefined && input.index > 0 && input.input?.[input.index - 1] !== ' ') return null;
        const code = state.schema.marks.code;
        if (code !== undefined && (state.doc.rangeHasMark(start, end, code) || state.selection.$from.marks().some((mark) => mark.type === code))) return null;

        const textIndex = input.length - 1;
        const text = input[textIndex];
        if (text === undefined) return null;
        const fullMatch = input[textIndex - 1];
        if (fullMatch === undefined) return null;
        const matchStart = start + input[0].indexOf(fullMatch);
        const matchEnd = matchStart + fullMatch.length - 1;
        const textStart = matchStart + fullMatch.lastIndexOf(text);
        const textEnd = textStart + text.length;
        const excluded = getMarksBetween(start, end, state)
            .filter((item) => item.mark.type.excludes(markType))
            .some((item) => item.end > matchStart);
        if (excluded) return null;
        const transaction = state.tr;
        if (textEnd < matchEnd) transaction.delete(textEnd, matchEnd);
        if (textStart > matchStart) transaction.delete(matchStart, textStart);
        transaction.addMark(matchStart, matchStart + text.length, markType.create());
        transaction.removeStoredMark(markType);
        return transaction;
    });
}

function getMarksBetween(start: number, end: number, state: EditorState): Array<{end: number; mark: Mark; start: number}> {
    const marks: Array<{end: number; mark: Mark; start: number}> = [];
    state.doc.nodesBetween(start, end, (node, position) => {
        for (const mark of node.marks) {
            marks.push({end: position + node.nodeSize, mark, start: position});
        }
    });
    return marks;
}

function escapeRegex(value: string): string {
    return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
