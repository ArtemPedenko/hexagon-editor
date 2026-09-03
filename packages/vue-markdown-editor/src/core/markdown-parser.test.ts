import MarkdownIt from 'markdown-it';
import { schema } from 'prosemirror-markdown';
import { describe, expect, it } from 'vitest';

import { MarkdownParser, MarkdownParserDynamicModifier } from './markdown-parser';

const tokens = {
  em: { name: 'em', type: 'mark' },
  paragraph: { name: 'paragraph', type: 'block' },
  softbreak: { name: 'hard_break', type: 'node' },
} as const;

describe('MarkdownParser', () => {
  it('parses marks and applies dynamic token attributes', () => {
    const modifier = new MarkdownParserDynamicModifier({
      paragraph: {
        processToken: [
          (token) => {
            token.attrSet('data-test', 'value');
            return token;
          },
        ],
      },
    });
    const parser = new MarkdownParser(schema, new MarkdownIt('commonmark'), tokens, { dynamicModifier: modifier });
    const document = parser.parse('*Text*');

    expect(document.textContent).toBe('Text');
    expect(document.firstChild?.firstChild?.marks[0]?.type.name).toBe('em');
  });
});
