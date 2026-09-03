import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { Deflist, DeflistNode, wrapToDeflist } from './deflist';

describe('Deflist extension', () => {
  it('parses and serializes definition lists', () => {
    const result = ExtensionsManager.process((builder) => builder.use(Deflist), { baseSchema: basicMarkdownSchema });
    const parsed = result.textParser.parse('Term\n: Description');

    expect(parsed.firstChild?.type.name).toBe(DeflistNode.List);
    expect(parsed.firstChild?.child(0).type.name).toBe(DeflistNode.Term);
    expect(result.serializer.serialize(parsed)).toBe('Term\n: Description\n');
    expect(result.plugins).toHaveLength(1);
  });

  it('wraps a textblock as a definition-list description', () => {
    const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Description'));
    const documentNode = basicMarkdownSchema.node('doc', null, [paragraph]);
    const state = EditorState.create({
      doc: documentNode,
      schema: basicMarkdownSchema,
      selection: TextSelection.create(documentNode, 1),
    });
    let next = state;

    expect(
      wrapToDeflist(state, (transaction) => {
        next = state.apply(transaction);
      }),
    ).toBe(true);
    expect(next.doc.firstChild?.type.name).toBe(DeflistNode.List);
  });
});
