import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { Blockquote, liftFromQuote, toggleQuote } from './blockquote';

describe('Blockquote extension', () => {
  it('registers schema, Markdown codec, input rule and Backspace keymap', () => {
    const result = ExtensionsManager.process((builder) => builder.use(Blockquote, { qouteKey: 'Mod-Shift-b' }), {
      baseSchema: basicMarkdownSchema,
    });

    expect(result.schema.nodes.blockquote).toBeDefined();
    expect(result.textParser.parse('> hello').firstChild?.type.name).toBe('blockquote');
    expect(result.serializer.serialize(result.textParser.parse('> hello'))).toBe('> hello\n');
    expect(result.plugins).toHaveLength(3);
  });

  it('wraps and unwraps a text cursor with the upstream toggle command', () => {
    const paragraph = basicMarkdownSchema.nodes.paragraph;
    if (paragraph === undefined) throw new Error('Basic schema must contain a paragraph node');
    const initial = EditorState.create({
      doc: basicMarkdownSchema.node('doc', null, [paragraph.create(null, basicMarkdownSchema.text('text'))]),
      schema: basicMarkdownSchema,
      selection: TextSelection.create(
        basicMarkdownSchema.node('doc', null, [paragraph.create(null, basicMarkdownSchema.text('text'))]),
        1,
      ),
    });
    let wrapped = initial;
    expect(
      toggleQuote(initial, (transaction) => {
        wrapped = initial.apply(transaction);
      }),
    ).toBe(true);
    expect(wrapped.doc.firstChild?.type.name).toBe('blockquote');

    const selection = TextSelection.create(wrapped.doc, 2);
    const quoted = EditorState.create({
      doc: wrapped.doc,
      schema: basicMarkdownSchema,
      selection,
    });
    let unwrapped = quoted;
    expect(
      toggleQuote(quoted, (transaction) => {
        unwrapped = quoted.apply(transaction);
      }),
    ).toBe(true);
    expect(unwrapped.doc.firstChild?.type.name).toBe('paragraph');
  });

  it('lifts a cursor from the first position in a blockquote', () => {
    const quoted = basicMarkdownSchema.node('doc', null, [
      basicMarkdownSchema.node('blockquote', null, [
        basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('text')),
      ]),
    ]);
    const state = EditorState.create({
      doc: quoted,
      schema: basicMarkdownSchema,
      selection: TextSelection.create(quoted, 2),
    });
    let next = state;

    expect(
      liftFromQuote(state, (transaction) => {
        next = state.apply(transaction);
      }),
    ).toBe(true);
    expect(next.doc.firstChild?.type.name).toBe('paragraph');
  });
});
