import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { Bold, boldMarkName, toggleBold } from './bold';

describe('Bold extension', () => {
	it('preserves asterisk and underscore Markdown delimiters', () => {
		const result = ExtensionsManager.process((builder) => builder.use(Bold, { boldKey: 'Mod-b' }), {
			baseSchema: basicMarkdownSchema,
		});
		const asterisk = result.textParser.parse('**hello**');
		const underscore = result.textParser.parse('__hello__');

		expect(asterisk.firstChild?.firstChild?.marks[0]?.attrs['data-markup']).toBe('**');
		expect(underscore.firstChild?.firstChild?.marks[0]?.attrs['data-markup']).toBe('__');
		expect(result.serializer.serialize(underscore)).toBe('__hello__\n');
		expect(result.plugins).toHaveLength(2);
	});

	it('toggles the strong mark for a text selection', () => {
		const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('text'));
		const documentNode = basicMarkdownSchema.node('doc', null, [paragraph]);
		const state = EditorState.create({
			doc: documentNode,
			schema: basicMarkdownSchema,
			selection: TextSelection.create(documentNode, 1, 5),
		});
		let next = state;

		expect(
			toggleBold(state, (transaction) => {
				next = state.apply(transaction);
			}),
		).toBe(true);
		expect(next.doc.firstChild?.firstChild?.marks[0]?.type.name).toBe(boldMarkName);
	});
});
