import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { QuoteLink, quoteLinkActionName, quoteLinkNodeName } from './quote-link';

describe('QuoteLink extension', () => {
  it('parses and serializes a QuoteLink block', () => {
    const { serializer, textParser } = ExtensionsManager.process((builder) => builder.use(QuoteLink), {
      baseSchema: basicMarkdownSchema,
    });
    const document = textParser.parse('> [Source](https://example.com){data-quotelink=true}\n>\n> Quoted text');

    expect(document.firstChild?.type.name).toBe(quoteLinkNodeName);
    expect(document.firstChild?.attrs).toMatchObject({
      cite: 'https://example.com',
      content: 'Source',
    });
    expect(serializer.serialize(document)).toContain('[Source](https://example.com){data-quotelink=true}');
  });

  it('registers an action that wraps and unwraps the current block', () => {
    const document = basicMarkdownSchema.node('doc', null, [
      basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Quote')),
    ]);
    let state = EditorState.create({
      doc: document,
      selection: TextSelection.create(document, 2),
    });
    const action = ExtensionsManager.process((builder) => builder.use(QuoteLink), {
      baseSchema: basicMarkdownSchema,
    }).actions.action(quoteLinkActionName);

    expect(action?.isEnabled({ state })).toBe(true);
    action?.run({
      state,
      dispatch: (transaction) => {
        state = state.apply(transaction);
      },
    });
    expect(state.doc.firstChild?.type.name).toBe(quoteLinkNodeName);
    expect(action?.isActive({ state })).toBe(true);
    action?.run({
      state,
      dispatch: (transaction) => {
        state = state.apply(transaction);
      },
    });
    expect(state.doc.firstChild?.type.name).toBe('paragraph');
  });
});
