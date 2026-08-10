import subPlugin from 'markdown-it-sub';
import {toggleMark} from 'prosemirror-commands';
import type {MarkSpec, MarkType} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';
import type {Command} from 'prosemirror-state';
import type {ExtensionAuto} from '../../core/extension-builder';
import {createMarkdownMarkInputRule} from './bold';
export const subscriptMarkName = 'sub';
export const subscriptMarkSpec: MarkSpec = {excludes: '_', parseDOM: [{tag: 'sub'}], toDOM: () => ['sub', 0]};
export const subscriptTokenSpec: ParseSpec = {mark: subscriptMarkName};
export const serializeSubscript: Parameters<typeof MarkdownSerializer>[1][string] = {close: (state) => { state.escapeWhitespace = false; return '~'; }, expelEnclosingWhitespace: true, mixable: false, open: (state) => { state.escapeWhitespace = true; return '~'; }};
export function getSubscriptType(schema: Parameters<Command>[0]['schema']): MarkType { const sub = schema.marks.sub; if (!sub) throw new Error('Subscript requires sub mark'); return sub; }
export const toggleSubscript: Command = (state, dispatch, view) => toggleMark(getSubscriptType(state.schema))(state, dispatch, view);
export const Subscript: ExtensionAuto = (builder) => builder.configureMd((markdown) => markdown.use(subPlugin)).addMarkSpec(subscriptMarkName, () => subscriptMarkSpec).addMarkdownTokenParserSpec(subscriptMarkName, () => subscriptTokenSpec).addMarkSerializerSpec(subscriptMarkName, () => serializeSubscript).addInputRules(({schema}) => ({rules: [createMarkdownMarkInputRule({close: '~', ignoreBetween: '~', open: '~'}, getSubscriptType(schema))]}));
