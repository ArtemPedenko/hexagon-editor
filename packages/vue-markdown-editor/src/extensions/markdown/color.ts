import type MarkdownIt from 'markdown-it';
import type { MarkSpec } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';

export const textColorNames = ['gray', 'yellow', 'orange', 'red', 'green', 'blue', 'violet'] as const;

export type TextColorName = (typeof textColorNames)[number];
type TextColorMessageKey =
	| 'colorGray'
	| 'colorYellow'
	| 'colorOrange'
	| 'colorRed'
	| 'colorGreen'
	| 'colorBlue'
	| 'colorViolet';

export const textColorMessageKeys: Record<TextColorName, TextColorMessageKey> = {
	gray: 'colorGray',
	yellow: 'colorYellow',
	orange: 'colorOrange',
	red: 'colorRed',
	green: 'colorGreen',
	blue: 'colorBlue',
	violet: 'colorViolet',
};

export const textColorCssVariables: Record<TextColorName, string> = {
	gray: '--markdown-editor-color-gray',
	yellow: '--markdown-editor-color-yellow',
	orange: '--markdown-editor-color-orange',
	red: '--markdown-editor-color-red',
	green: '--markdown-editor-color-green',
	blue: '--markdown-editor-color-blue',
	violet: '--markdown-editor-color-violet',
};

export function isTextColorName(value: string): value is TextColorName {
	return (textColorNames as readonly string[]).includes(value);
}

export function getTextColorCssValue(color: string): string {
	const name = isTextColorName(color) ? color : 'gray';
	return `var(${textColorCssVariables[name]})`;
}

export const colorMarkSpec: MarkSpec = {
	attrs: {
		color: { default: 'gray' },
	},
	toDOM: (mark) => ['span', { style: `color: ${getTextColorCssValue(String(mark.attrs.color))}` }, 0],
};

export const colorTokenSpec: ParseSpec = {
	mark: 'color',
	getAttrs: (token) => ({ color: String(token.meta?.color ?? 'gray') }),
};

export function configureColorMarkdown(markdown: MarkdownIt): MarkdownIt {
	markdown.inline.ruler.before('emphasis', 'color', (state, silent) => {
		const start = state.pos;
		if (state.src[start] !== '{' || isEscaped(state.src, start)) return false;

		const colorEnd = state.src.indexOf('}', start + 1);
		if (colorEnd < 0 || state.src[colorEnd + 1] !== '(') return false;
		const color = state.src.slice(start + 1, colorEnd);
		if (!isTextColorName(color)) return false;

		const contentStart = colorEnd + 2;
		const contentEnd = findClosingParenthesis(state.src, contentStart, state.posMax);
		if (contentEnd < 0) return false;
		if (!silent) {
			const open = state.push('color_open', 'span', 1);
			open.attrSet('style', `color: ${getTextColorCssValue(color)}`);
			open.meta = { color };

			const previousMaximum = state.posMax;
			state.pos = contentStart;
			state.posMax = contentEnd;
			state.md.inline.tokenize(state);
			state.posMax = previousMaximum;

			state.push('color_close', 'span', -1);
		}
		state.pos = contentEnd + 1;
		return true;
	});
	return markdown;
}

function findClosingParenthesis(source: string, start: number, maximum: number): number {
	let depth = 1;
	for (let index = start; index < maximum; index += 1) {
		if (isEscaped(source, index)) continue;
		if (source[index] === '(') depth += 1;
		if (source[index] === ')') depth -= 1;
		if (depth === 0) return index;
	}
	return -1;
}

function isEscaped(source: string, position: number): boolean {
	let slashes = 0;
	for (let index = position - 1; index >= 0 && source[index] === '\\'; index -= 1) slashes += 1;
	return slashes % 2 === 1;
}
