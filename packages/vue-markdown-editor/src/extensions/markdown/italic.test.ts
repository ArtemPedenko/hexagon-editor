import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { Italic, italicMarkName, toggleItalic } from './italic';

describe('Italic extension', () => {
  it('preserves asterisk and underscore Markdown delimiters', () => {
    const result = ExtensionsManager.process((builder) => builder.use(Italic, { italicKey: 'Mod-i' }), {
      baseSchema: basicMarkdownSchema,
    });
    const asterisk = result.textParser.parse('*hello*');
    const underscore = result.textParser.parse('_hello_');

    expect(asterisk.firstChild?.firstChild?.marks[0]?.attrs['data-markup']).toBe('*');
    expect(underscore.firstChild?.firstChild?.marks[0]?.attrs['data-markup']).toBe('_');
    expect(result.serializer.serialize(underscore)).toBe('_hello_\n');
    expect(result.plugins).toHaveLength(2);
  });

  it('toggles the em mark for a text selection', () => {
    const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('text'));
    const documentNode = basicMarkdownSchema.node('doc', null, [paragraph]);
    const state = EditorState.create({
      doc: documentNode,
      schema: basicMarkdownSchema,
      selection: TextSelection.create(documentNode, 1, 5),
    });
    let next = state;

    expect(
      toggleItalic(state, (transaction) => {
        next = state.apply(transaction);
      }),
    ).toBe(true);
    expect(next.doc.firstChild?.firstChild?.marks[0]?.type.name).toBe(italicMarkName);
  });
});
