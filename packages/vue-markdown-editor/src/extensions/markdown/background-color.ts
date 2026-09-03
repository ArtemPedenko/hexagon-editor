import type MarkdownIt from 'markdown-it';
import type { MarkSpec } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';

export const textBackgroundColorNames = ['gray', 'yellow', 'orange', 'red', 'green', 'blue', 'violet'] as const;
export const textBackgroundColorMenuNames = ['default', ...textBackgroundColorNames] as const;

export type TextBackgroundColorName = (typeof textBackgroundColorMenuNames)[number];
type TextBackgroundColorMessageKey =
  | 'backgroundColorDefault'
  | 'backgroundColorGray'
  | 'backgroundColorYellow'
  | 'backgroundColorOrange'
  | 'backgroundColorRed'
  | 'backgroundColorGreen'
  | 'backgroundColorBlue'
  | 'backgroundColorViolet';

export const textBackgroundColorMessageKeys: Record<TextBackgroundColorName, TextBackgroundColorMessageKey> = {
  default: 'backgroundColorDefault',
  gray: 'backgroundColorGray',
  yellow: 'backgroundColorYellow',
  orange: 'backgroundColorOrange',
  red: 'backgroundColorRed',
  green: 'backgroundColorGreen',
  blue: 'backgroundColorBlue',
  violet: 'backgroundColorViolet',
};

export const textBackgroundColorCssVariables: Record<TextBackgroundColorName, string> = {
  gray: '--markdown-editor-background-color-gray',
  yellow: '--markdown-editor-background-color-yellow',
  orange: '--markdown-editor-background-color-orange',
  red: '--markdown-editor-background-color-red',
  green: '--markdown-editor-background-color-green',
  blue: '--markdown-editor-background-color-blue',
  violet: '--markdown-editor-background-color-violet',
};

export function isTextBackgroundColorName(value: string): value is TextBackgroundColorName {
  return (textBackgroundColorNames as readonly string[]).includes(value);
}

export function getTextBackgroundColorCssValue(color: string): string {
  const name = isTextBackgroundColorName(color) ? color : 'gray';
  return `var(${textBackgroundColorCssVariables[name]})`;
}

export const backgroundColorMarkSpec: MarkSpec = {
  attrs: {
    color: { default: 'gray' },
  },
  toDOM: (mark) => [
    'span',
    { style: `background-color: ${getTextBackgroundColorCssValue(String(mark.attrs.color))}` },
    0,
  ],
};

export const backgroundColorTokenSpec: ParseSpec = {
  mark: 'background_color',
  getAttrs: (token) => ({ color: String(token.meta?.color ?? 'gray') }),
};

export function configureBackgroundColorMarkdown(markdown: MarkdownIt): MarkdownIt {
  markdown.inline.ruler.before('emphasis', 'background_color', (state, silent) => {
    const start = state.pos;
    if (state.src[start] !== '{' || isEscaped(state.src, start)) return false;

    const colorEnd = state.src.indexOf('}', start + 1);
    if (colorEnd < 0 || state.src[colorEnd + 1] !== '(') return false;
    const color = state.src.slice(start + 4, colorEnd);
    if (!state.src.startsWith('{bg-', start) || !isTextBackgroundColorName(color)) return false;

    const contentStart = colorEnd + 2;
    const contentEnd = findClosingParenthesis(state.src, contentStart, state.posMax);
    if (contentEnd < 0) return false;
    if (!silent) {
      const open = state.push('background_color_open', 'span', 1);
      open.attrSet('style', `background-color: ${getTextBackgroundColorCssValue(color)}`);
      open.meta = { color };

      const previousMaximum = state.posMax;
      state.pos = contentStart;
      state.posMax = contentEnd;
      state.md.inline.tokenize(state);
      state.posMax = previousMaximum;

      state.push('background_color_close', 'span', -1);
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
