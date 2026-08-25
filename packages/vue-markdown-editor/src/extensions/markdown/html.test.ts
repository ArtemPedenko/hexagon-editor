import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { Html, HtmlAttr, HtmlNode } from './html';

describe('Html extension', () => {
	it('parses and serializes inline HTML tokens', () => {
		const result = ExtensionsManager.process((builder) => builder.use(Html), {
			baseSchema: basicMarkdownSchema,
			markdown: { html: true },
		});
		const parsed = result.textParser.parse('Text <span>HTML</span>');

		expect(parsed.firstChild?.child(1).type.name).toBe(HtmlNode.Inline);
		expect(parsed.firstChild?.child(1).attrs[HtmlAttr.Content]).toBe('<span>');
		expect(result.serializer.serialize(parsed)).toBe('Text <span>HTML</span>\n');
	});
});
