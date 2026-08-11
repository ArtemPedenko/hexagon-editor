import {NodeSelection} from 'prosemirror-state';
import type {EditorState} from 'prosemirror-state';
import type {Node as ProseMirrorNode, Schema} from 'prosemirror-model';

import {getCurrentLink} from '../extensions/markdown/link';
import {CodeBlockAttrs} from '../extensions/markdown/code-block';

import type {BasicWysiwygSelectionState} from './basic-editor-types';
import {getBasicMarkType} from './basic-editor-command-helpers';

function hasActiveMark(state: EditorState, schema: Schema, markName: string): boolean {
    const mark = getBasicMarkType(schema, markName);
    const {empty, from, to, $from} = state.selection;
    return empty ? Boolean(mark.isInSet(state.storedMarks ?? $from.marks())) : state.doc.rangeHasMark(from, to, mark);
}

function hasAncestor(state: EditorState, nodeName: string): boolean {
    const {$from} = state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
        if ($from.node(depth).type.name === nodeName) return true;
    }
    return false;
}

export function getBasicWysiwygSelectionState(
    state: EditorState,
    schema: Schema,
    atomicSourceNode: ProseMirrorNode | undefined,
): BasicWysiwygSelectionState {
    const {$from} = state.selection;
    const currentLink = getCurrentLink(state);
    const selectedNode = state.selection instanceof NodeSelection ? state.selection.node : undefined;
    const codeBlock = selectedNode?.type.name === 'code_block' ? selectedNode : $from.parent.type.name === 'code_block' ? $from.parent : undefined;
    const image = selectedNode?.type.name === 'image' ? selectedNode : undefined;

    return {
        bold: hasActiveMark(state, schema, 'strong'), bulletList: hasAncestor(state, 'bullet_list'), code: hasActiveMark(state, schema, 'code'),
        codeBlock: codeBlock !== undefined, codeBlockLanguage: codeBlock?.attrs[CodeBlockAttrs.Lang] as string | undefined,
        formula: atomicSourceNode?.type.name === 'inline_math' || atomicSourceNode?.type.name === 'math_block',
        headingFolded: $from.parent.type.name === 'heading' && $from.parent.attrs.folding === true,
        headingLevel: $from.parent.type.name === 'heading' ? Number($from.parent.attrs.level) : undefined,
        image: image !== undefined, imageObjectFit: image?.attrs['object-fit'] as string | undefined,
        italic: hasActiveMark(state, schema, 'em'), linkHref: currentLink?.href, linkText: currentLink?.text, linkTitle: currentLink?.title ?? undefined,
        mark: hasActiveMark(state, schema, 'mark'), orderedList: hasAncestor(state, 'ordered_list'), quote: hasAncestor(state, 'blockquote'),
        strikethrough: hasActiveMark(state, schema, 'strike'), underline: hasActiveMark(state, schema, 'underline'),
    };
}

export function keepListFocus(command: import('prosemirror-state').Command): import('prosemirror-state').Command {
    return (state, dispatch, view) => {
        if (!hasAncestor(state, 'list_item')) return false;
        command(state, dispatch, view);
        return true;
    };
}
