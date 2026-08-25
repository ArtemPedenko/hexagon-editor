import { lift, wrapIn } from 'prosemirror-commands';
import { wrappingInputRule } from 'prosemirror-inputrules';
import type { Command } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

import { BlockquoteSpecs, blockquoteNodeName } from './blockquote-specs';

export {
	BlockquoteSpecs,
	blockquoteNodeName,
	blockquoteNodeSpec,
	blockquoteTokenSpec,
	serializeBlockquote,
} from './blockquote-specs';

export interface BlockquoteOptions {
	qouteKey?: string | null;
}

export function getBlockquoteType(schema: Parameters<Command>[0]['schema']) {
	const blockquote = schema.nodes[blockquoteNodeName];
	if (blockquote === undefined) throw new Error('Blockquote extension requires a blockquote node');
	return blockquote;
}

/** Lift a cursor from the first position of a blockquote, as in upstream Blockquote commands. */
export const liftFromQuote: Command = (state, dispatch) => {
	const { selection } = state;
	if (!(selection instanceof TextSelection) || selection.$cursor === null) return false;
	if (selection.$cursor.parentOffset !== 0 || selection.$cursor.node(-1).type.name !== blockquoteNodeName) {
		return false;
	}
	return lift(state, dispatch);
};

/** Toggle the enclosing blockquote for a cursor or wrap a non-cursor selection. */
export const toggleQuote: Command = (state, dispatch) => {
	const blockquote = getBlockquoteType(state.schema);
	const { selection } = state;
	if (!(selection instanceof TextSelection) || selection.$cursor === null) {
		return wrapIn(blockquote)(state, dispatch);
	}

	for (let depth = selection.$cursor.depth; depth > 0; depth -= 1) {
		if (selection.$cursor.node(depth).type.name !== blockquoteNodeName) continue;
		return lift(state, dispatch);
	}
	return wrapIn(blockquote)(state, dispatch);
};

/** Upstream Blockquote registration excluding joinPrevQuote until commands/join is ported. */
export const Blockquote: ExtensionAuto<BlockquoteOptions> = (builder, options) => {
	builder.use(BlockquoteSpecs);
	if (options?.qouteKey !== null && options?.qouteKey !== undefined) {
		builder.addKeymap(({ schema }) => ({
			[options.qouteKey!]: wrapIn(getBlockquoteType(schema)),
		}));
	}
	builder.addKeymap(() => ({ Backspace: liftFromQuote }));
	builder.addInputRules(({ schema }) => ({
		rules: [wrappingInputRule(/^\s*>\s$/, getBlockquoteType(schema))],
	}));
};
