import { describe, expect, it } from 'vitest';

import { basicMarkdownCodec } from '../../core/basic-editor';

describe('Color extension', () => {
	it('parses and serializes named text colors with nested marks', () => {
		const source = 'Обычный {red}(красный **жирный**) текст';
		const document = basicMarkdownCodec.parse(source);
		const colorMark = document.firstChild?.child(1).marks.find((mark) => mark.type.name === 'color');

		expect(colorMark?.attrs.color).toBe('red');
		expect(basicMarkdownCodec.serialize(document)).toBe(source);
	});

	it('keeps an unknown color as plain text', () => {
		const source = '{unknown}(текст)';

		expect(basicMarkdownCodec.serialize(basicMarkdownCodec.parse(source))).toBe(source);
	});
});
