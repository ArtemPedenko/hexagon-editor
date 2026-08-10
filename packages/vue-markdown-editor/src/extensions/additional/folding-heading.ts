import type {Node} from 'prosemirror-model';
import {textblockTypeInputRule} from 'prosemirror-inputrules';
import {Plugin, PluginKey} from 'prosemirror-state';
import type {Command} from 'prosemirror-state';
import {Decoration, DecorationSet} from 'prosemirror-view';

import type {ExtensionAuto} from '../../core/extension-builder';

const foldingPluginKey = new PluginKey<DecorationSet>('folding-heading');
const FOLDING_GUTTER_WIDTH = 24;

export const toggleFoldingHeading: Command = (state, dispatch) => {
    const {$from} = state.selection;
    if ($from.parent.type.name !== 'heading') return false;
    dispatch?.(state.tr.setNodeMarkup($from.before(), undefined, {...$from.parent.attrs, folding: !$from.parent.attrs.folding}).scrollIntoView());
    return true;
};

function decorations(document: Node): DecorationSet {
    const result: Decoration[] = [];
    let foldedLevel: number | undefined;
    document.forEach((node, offset) => {
        if (node.type.name === 'heading') {
            const level = Number(node.attrs.level);
            if (foldedLevel !== undefined && level <= foldedLevel) foldedLevel = undefined;
            if (node.attrs.folding === true) foldedLevel = level;
            if (node.attrs.folding !== null) {
                result.push(Decoration.node(offset, offset + node.nodeSize, {
                    class: node.attrs.folding === true
                        ? 'markdown-editor__folding-heading markdown-editor__folding-heading--folded'
                        : 'markdown-editor__folding-heading',
                }));
            }
        } else if (foldedLevel !== undefined) {
            result.push(Decoration.node(offset, offset + node.nodeSize, {class: 'markdown-editor__folded-content'}));
        }
    });
    return DecorationSet.create(document, result);
}

export const FoldingHeading: ExtensionAuto = (builder) => {
    builder
        .addInputRules(({schema}) => {
            const heading = schema.nodes.heading;
            if (heading === undefined) throw new Error('FoldingHeading requires a heading node');
            return {rules: [textblockTypeInputRule(/^(#{1,6})\+\s$/, heading, (match) => ({folding: false, level: match[1]?.length ?? 1}))]};
        })
        .addPlugin(() => new Plugin({
            key: foldingPluginKey,
            props: {
                decorations: (state) => foldingPluginKey.getState(state),
                handleClick: (view, position, event) => {
                    const $position = view.state.doc.resolve(position);
                    if ($position.parent.type.name !== 'heading') return false;
                    const dom = view.nodeDOM($position.before());
                    if (!(dom instanceof HTMLElement) || event.clientX > dom.getBoundingClientRect().left + FOLDING_GUTTER_WIDTH) return false;
                    return toggleFoldingHeading(view.state, view.dispatch);
                },
            },
            state: {
                apply: (transaction, previous) => transaction.docChanged ? decorations(transaction.doc) : previous.map(transaction.mapping, transaction.doc),
                init: (_config, state) => decorations(state.doc),
            },
        }));
};
