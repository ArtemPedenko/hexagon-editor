import {toggleMark} from 'prosemirror-commands';
import {InputRule} from 'prosemirror-inputrules';
import type {MarkType} from 'prosemirror-model';
import type {Command, EditorState} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

import {LinkAttr, LinkSpecs, linkMarkName} from './link-specs';

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

export const Link: ExtensionAuto<LinkOptions> = (builder, options) => {
    builder.use(LinkSpecs);
    if (options?.linkKey !== null && options?.linkKey !== undefined) {
        builder.addKeymap(({schema}) => ({[options.linkKey!]: toggleMark(getLinkType(schema))}));
    }
    builder.addInputRules(({schema}) => ({rules: [linkInputRule(getLinkType(schema))]}));
};

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
