import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { defaultYfmHtml, YfmHtmlBlock, yfmHtmlBlockActionName, yfmHtmlBlockNodeName } from './yfm-html-block';

describe('YfmHtmlBlock extension', () => {
	it('parses and serializes an HTML directive', () => {
		const { serializer, textParser } = ExtensionsManager.process((builder) => builder.use(YfmHtmlBlock), {
			baseSchema: basicMarkdownSchema,
		});
		const document = textParser.parse(':::html\n<section>Content</section>\n:::');

		expect(document.firstChild?.type.name).toBe(yfmHtmlBlockNodeName);
		expect(document.firstChild?.attrs.html).toBe('<section>Content</section>');
		expect(serializer.serialize(document)).toContain(':::html\n<section>Content</section>\n:::');
	});

	it('registers an action that inserts an editable HTML block', () => {
		const document = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('paragraph')]);
		let state = EditorState.create({
			doc: document,
			selection: TextSelection.create(document, 1),
		});
		const action = ExtensionsManager.process((builder) => builder.use(YfmHtmlBlock), {
			baseSchema: basicMarkdownSchema,
		}).actions.action(yfmHtmlBlockActionName);

		expect(action?.isEnabled({ state })).toBe(true);
		action?.run({
			state,
			dispatch: (transaction) => {
				state = state.apply(transaction);
			},
		});
		expect(state.doc.firstChild?.type.name).toBe(yfmHtmlBlockNodeName);
		expect(state.doc.firstChild?.attrs.html).toBe(defaultYfmHtml);
	});
});
