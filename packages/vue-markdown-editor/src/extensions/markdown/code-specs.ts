import type { Node } from 'prosemirror-model';
import type { MarkSpec } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';
import type { MarkdownSerializer } from 'prosemirror-markdown';

import type { ExtensionAuto } from '../../core/extension-builder';

export const codeMarkName = 'code';

export const codeMarkSpec: MarkSpec = {
	code: true,
	parseDOM: [{ tag: 'code' }],
	toDOM: () => ['code'],
};

export const codeTokenSpec: ParseSpec = {
	mark: codeMarkName,
	noCloseToken: true,
};

export const serializeCode: ConstructorParameters<typeof MarkdownSerializer>[1][string] = {
	close: (_state, _mark, parent, index) => backticksFor(parent.child(index - 1), 1),
	escape: false,
	open: (_state, _mark, parent, index) => backticksFor(parent.child(index), -1),
};

export const CodeSpecs: ExtensionAuto = (builder) => {
	builder
		.addMarkSpec(codeMarkName, () => codeMarkSpec, builder.Priority.Lowest)
		.addMarkdownTokenParserSpec('code_inline', () => codeTokenSpec)
		.addMarkSerializerSpec(codeMarkName, () => serializeCode);
};

function backticksFor(node: Node, side: number): string {
	const ticks = /`+/g;
	let match: RegExpExecArray | null;
	let length = 0;
	if (node.isText) {
		while ((match = ticks.exec(node.text ?? '')) !== null) length = Math.max(length, match[0].length);
	}
	let result = length > 0 && side > 0 ? ' `' : '`';
	for (let index = 0; index < length; index += 1) result += '`';
	if (length > 0 && side < 0) result += ' ';
	return result;
}
