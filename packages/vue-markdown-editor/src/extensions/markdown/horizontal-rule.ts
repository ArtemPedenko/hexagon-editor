import {InputRule} from 'prosemirror-inputrules';
import type {NodeType} from 'prosemirror-model';
import type {Command, EditorState, Selection} from 'prosemirror-state';
import {NodeSelection, TextSelection} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

import {HorizontalRuleSpecs, horizontalRuleMarkupAttr, horizontalRuleNodeName} from './horizontal-rule-specs';

export {
    HorizontalRuleSpecs,
    horizontalRuleMarkupAttr,
    horizontalRuleNodeName,
    horizontalRuleNodeSpec,
    horizontalRuleTokenSpec,
    serializeHorizontalRule,
} from './horizontal-rule-specs';

export function getHorizontalRuleType(schema: EditorState['schema']): NodeType {
    const horizontalRule = schema.nodes[horizontalRuleNodeName];
    if (horizontalRule === undefined) throw new Error('HorizontalRule extension requires a horizontal_rule node');
    return horizontalRule;
}

export const addHorizontalRule =
    (horizontalRule: NodeType): Command =>
    (state, dispatch) => {
        if (isHorizontalRuleSelection(state.selection)) return true;
        if (state.selection instanceof NodeSelection) {
            dispatch?.(state.tr.replaceSelectionWith(horizontalRule.create()).scrollIntoView());
            return true;
        }
        if (!(state.selection instanceof TextSelection)) return false;
        const cursor = state.selection.$cursor;
        if (cursor === null || cursor.parent.type.spec.complex === true) return false;
        if (dispatch === undefined) return true;

        const paragraph = state.schema.nodes.paragraph;
        if (paragraph === undefined) return false;
        const transaction = state.tr;
        if (cursor.parent.type === paragraph && cursor.parent.nodeSize === 2) {
            transaction.insert(cursor.before(), horizontalRule.create());
        } else {
            const position = cursor.after();
            transaction.insert(position, [horizontalRule.create(), paragraph.create()]);
            transaction.setSelection(TextSelection.create(transaction.doc, position + 2));
        }
        dispatch(transaction.scrollIntoView());
        return true;
    };

export const HorizontalRule: ExtensionAuto = (builder) => {
    builder.use(HorizontalRuleSpecs);
    builder.addInputRules(({schema}) => ({
        rules: [new InputRule(/^(---|___|\*\*\*)$/, (state, match, start, end) => {
            const paragraph = state.schema.nodes.paragraph;
            if (paragraph === undefined) return null;
            return state.tr.replaceWith(
                start - 1,
                end,
                [getHorizontalRuleType(schema).create({[horizontalRuleMarkupAttr]: match[0]}), paragraph.create()],
            ).setSelection(TextSelection.create(state.tr.doc, start + 1));
        })],
    }));
};

function isHorizontalRuleSelection(selection: Selection): boolean {
    return selection instanceof NodeSelection && selection.node.type.name === horizontalRuleNodeName;
}
