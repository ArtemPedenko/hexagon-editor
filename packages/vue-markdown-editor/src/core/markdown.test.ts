import { describe, expect, it } from 'vitest';

import { MarkdownCodec } from './markdown';

describe('MarkdownCodec', () => {
	const codec = new MarkdownCodec();

	it('parses CommonMark into the base ProseMirror schema', () => {
		const document = codec.parse('# Heading\n\nParagraph with **strong** and [link](https://example.com).');

		expect(document.type.name).toBe('doc');
		expect(document.firstChild?.type.name).toBe('heading');
		expect(document.textContent).toBe('HeadingParagraph with strong and link.');
	});

	it('round-trips base blocks, marks and lists through Markdown', () => {
		const source = [
			'# Editor',
			'',
			'A paragraph with **strong** and _emphasis_.',
			'',
			'- first item',
			'- second item',
			'',
			'> a quote',
		].join('\n');

		const firstDocument = codec.parse(source);
		const serialized = codec.serialize(firstDocument);
		const secondDocument = codec.parse(serialized);

		expect(secondDocument.eq(firstDocument)).toBe(true);
		expect(serialized).toContain('# Editor');
		expect(serialized).toContain('**strong**');
		expect(serialized).toContain('* first item');
		expect(serialized).toContain('> a quote');
	});
});
