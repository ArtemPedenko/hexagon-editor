import {newlineInCode, setBlockType} from 'prosemirror-commands';
import type {Command, EditorState} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

import {CodeBlockSpecs, codeBlockNodeName} from './code-block-specs';

export {CodeBlockAttrs, CodeBlockSpecs, codeBlockNodeName, codeBlockNodeSpec, codeBlockTokenSpecs, serializeCodeBlock} from './code-block-specs';
export {newlineInCode};

export interface CodeBlockOptions {
    codeBlockKey?: string | null;
}

export function getCodeBlockType(schema: EditorState['schema']) {
    const codeBlock = schema.nodes[codeBlockNodeName];
    if (codeBlock === undefined) throw new Error('CodeBlock extension requires a code_block node');
    return codeBlock;
}

export const setCodeBlock: Command = (state, dispatch, view) => setBlockType(getCodeBlockType(state.schema))(state, dispatch, view);

export const resetCodeBlock: Command = (state, dispatch, view) => {
    if (!state.selection.empty || state.selection.$from.parent.type !== getCodeBlockType(state.schema)) return false;
    return view?.endOfTextblock('backward', state) === true
        ? setBlockType(state.schema.nodes.paragraph!)(state, dispatch, view)
        : false;
};

export const CodeBlock: ExtensionAuto<CodeBlockOptions> = (builder, options) => {
    builder.use(CodeBlockSpecs);
    if (options?.codeBlockKey !== null && options?.codeBlockKey !== undefined) {
        builder.addKeymap(({schema}) => ({[options.codeBlockKey!]: setBlockType(getCodeBlockType(schema))}));
    }
};
