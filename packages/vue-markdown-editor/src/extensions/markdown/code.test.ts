import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { Code, codeMarkName, toggleCode } from './code';

describe('Code extension', () => {
  it('parses and serializes inline code with backticks', () => {
    const result = ExtensionsManager.process((builder) => builder.use(Code, { codeKey: 'Mod-`' }), {
      baseSchema: basicMarkdownSchema,
    });
    const parsed = result.textParser.parse('`hello`');

    expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe(codeMarkName);
    expect(result.serializer.serialize(parsed)).toBe('`hello`\n');
    expect(result.plugins).toHaveLength(4);
  });

  it('uses additional backticks for code containing a backtick', () => {
    const parsed = basicMarkdownSchema.node('doc', null, [
      basicMarkdownSchema.node('paragraph', null, [
        basicMarkdownSchema.text('`', [basicMarkdownSchema.marks.code.create()]),
      ]),
    ]);

    expect(
      ExtensionsManager.process((builder) => builder.use(Code), {
        baseSchema: basicMarkdownSchema,
      }).serializer.serialize(parsed),
    ).toBe('`` ` ``\n');
  });

  it('toggles the code mark for a text selection', () => {
    const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('text'));
    const documentNode = basicMarkdownSchema.node('doc', null, [paragraph]);
    const state = EditorState.create({
      doc: documentNode,
      schema: basicMarkdownSchema,
      selection: TextSelection.create(documentNode, 1, 5),
    });
    let next = state;

    expect(
      toggleCode(state, (transaction) => {
        next = state.apply(transaction);
      }),
    ).toBe(true);
    expect(next.doc.firstChild?.firstChild?.marks[0]?.type.name).toBe(codeMarkName);
  });
});
