import { wrappingInputRule } from 'prosemirror-inputrules';
import type MarkdownIt from 'markdown-it';
import type { NodeSpec, NodeType } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';
import type { MarkdownSerializer } from 'prosemirror-markdown';
import { EditorState } from 'prosemirror-state';
import type { Command } from 'prosemirror-state';
import { lift, wrapIn } from 'prosemirror-commands';

import type { ExtensionAuto } from '../../core/extension-builder';

export const quoteLinkNodeName = 'quote_link';
export const quoteLinkActionName = 'quoteLink';

export interface QuoteLinkActionContext {
	dispatch?: Parameters<Command>[1];
	state: EditorState;
}

export function configureQuoteLinkMarkdown(markdown: MarkdownIt): MarkdownIt {
	markdown.core.ruler.after('inline', 'quote_link', (state) => {
		let index = 0;
		while (index < state.tokens.length) {
			const token = state.tokens[index];
			const paragraph = state.tokens[index + 1];
			const inline = state.tokens[index + 2];
			const paragraphClose = state.tokens[index + 3];
			if (
				token?.type !== 'blockquote_open' ||
				paragraph?.type !== 'paragraph_open' ||
				inline?.type !== 'inline' ||
				paragraphClose?.type !== 'paragraph_close'
			) {
				index += 1;
				continue;
			}
			const match = inline.content.match(/^\[([^\]]+)\]\(([^)]+)\)\{data-quotelink=true\}$/);
			if (match === null) {
				index += 1;
				continue;
			}
			const closeIndex = state.tokens.findIndex(
				(candidate, candidateIndex) => candidateIndex > index && candidate.type === 'blockquote_close',
			);
			if (closeIndex === -1) {
				index += 1;
				continue;
			}
			token.type = `${quoteLinkNodeName}_open`;
			token.attrSet('cite', match[2] ?? '');
			token.attrSet('data-content', match[1] ?? '');
			state.tokens[closeIndex]!.type = `${quoteLinkNodeName}_close`;
			state.tokens.splice(index + 1, 3);
			index += 1;
		}
	});
	return markdown;
}

export const quoteLinkNodeSpec: NodeSpec = {
	attrs: { cite: { default: '' }, content: { default: '' } },
	content: 'block+',
	defining: true,
	group: 'block',
	toDOM: (node) => [
		'blockquote',
		{
			cite: node.attrs.cite,
			'data-content': node.attrs.content,
			'data-quote-link': '',
		},
		0,
	],
};

export const quoteLinkTokenSpec: ParseSpec = {
	block: quoteLinkNodeName,
	getAttrs: (token) => ({
		cite: token.attrGet('cite'),
		content: token.attrGet('data-content'),
	}),
};

export const serializeQuoteLink: ConstructorParameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
	state.wrapBlock('> ', null, node, () => {
		state.write(`[${node.attrs.content}](${node.attrs.cite}){data-quotelink=true}`);
		state.write('\n\n');
		state.renderContent(node);
	});
};

export function getQuoteLinkType(schema: EditorState['schema']): NodeType {
	const type = schema.nodes[quoteLinkNodeName];
	if (type === undefined) throw new Error('QuoteLink extension requires a quote_link node');
	return type;
}

export const toggleQuoteLink: Command = (state, dispatch) => {
	const type = getQuoteLinkType(state.schema);
	for (let depth = state.selection.$from.depth; depth > 0; depth -= 1) {
		if (state.selection.$from.node(depth).type === type) return lift(state, dispatch);
	}
	return wrapIn(type)(state, dispatch);
};

function isQuoteLinkActionContext(value: unknown): value is QuoteLinkActionContext {
	return typeof value === 'object' && value !== null && 'state' in value && value.state instanceof EditorState;
}

function isInsideQuoteLink(state: EditorState): boolean {
	for (let depth = state.selection.$from.depth; depth > 0; depth -= 1) {
		if (state.selection.$from.node(depth).type.name === quoteLinkNodeName) return true;
	}
	return false;
}

export const QuoteLink: ExtensionAuto = (builder) => {
	builder
		.configureMd(configureQuoteLinkMarkdown)
		.addNodeSpec(quoteLinkNodeName, () => quoteLinkNodeSpec)
		.addMarkdownTokenParserSpec(quoteLinkNodeName, () => quoteLinkTokenSpec)
		.addNodeSerializerSpec(quoteLinkNodeName, () => serializeQuoteLink)
		.addAction(quoteLinkActionName, () => ({
			isActive: (context?: unknown) => isQuoteLinkActionContext(context) && isInsideQuoteLink(context.state),
			isEnabled: (context?: unknown) => isQuoteLinkActionContext(context) && toggleQuoteLink(context.state),
			metadata: () => undefined,
			run: (context?: unknown) => {
				if (isQuoteLinkActionContext(context)) toggleQuoteLink(context.state, context.dispatch);
			},
		}))
		.addInputRules(
			({ schema }) => ({
				rules: [wrappingInputRule(/^\s*>\s$/, getQuoteLinkType(schema))],
			}),
			builder.Priority.High,
		);
};
