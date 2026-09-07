import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import { renderMarkdownContent } from './markdown';
import { createBasicMarkdownCodec, basicMarkdownSchema } from '../core/basic-editor-markdown';

const component = defineComponent({});
describe('directive attributes', () => {
  it('uses each block token and ignores fenced examples', () => {
    const source =
      '```markdown\n::: note {wrong}\nexample\n:::\n```\n\n::: note {right}\nActual\n:::\n\n::: note {second}\nSecond\n:::\n\n::: note\nEmpty\n:::\n\n::: note {bad}\nBad\n:::\n\n::: note {}\nEmpty braces\n:::';
    const target = document.createElement('div');
    target.innerHTML = renderMarkdownContent(
      source,
      {},
      {
        note: {
          component,
          insert: { attrs: {}, content: '' },
          parseAttributes: (raw) => {
            if (raw === 'bad') throw new Error('bad');
            return { value: raw };
          },
        },
      },
    );
    expect(
      [...target.querySelectorAll<HTMLElement>('[data-directive]')].map((el) =>
        JSON.parse(decodeURIComponent(el.dataset.directiveAttrs!)),
      ),
    ).toEqual([{ value: 'right' }, { value: 'second' }, {}, {}, { value: '' }]);
  });
  it('round-trips inserted JSON attributes using the documented bracket contract', () => {
    const note = {
      component,
      insert: { attrs: { variant: 'info' }, content: 'Body' },
      parseAttributes: (raw: string) => JSON.parse('{' + raw + '}'),
      serializeAttributes: (attrs: Record<string, unknown>) => JSON.stringify(attrs).slice(1, -1),
    };
    const codec = createBasicMarkdownCodec({ note });
    const doc = basicMarkdownSchema.nodes.doc.create(
      null,
      basicMarkdownSchema.nodes.directive.create({
        name: 'note',
        attrs: note.insert.attrs,
        content: note.insert.content,
      }),
    );
    const markdown = codec.serialize(doc);
    expect(markdown).toBe('::: note {"variant":"info"}\nBody\n:::');
    expect(codec.parse(markdown).firstChild?.attrs.attrs).toEqual({ variant: 'info' });
    expect(renderMarkdownContent(markdown, {}, { note })).toContain(
      encodeURIComponent(JSON.stringify(note.insert.attrs)),
    );
  });
});
