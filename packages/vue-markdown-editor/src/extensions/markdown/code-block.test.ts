import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { CodeBlock, CodeBlockAttrs, codeBlockNodeName, setCodeBlock, setCodeBlockLanguage } from './code-block';

describe('CodeBlock extension', () => {
  it('preserves fenced code language and markup', () => {
    const result = ExtensionsManager.process((builder) => builder.use(CodeBlock, { codeBlockKey: 'Mod-Alt-c' }), {
      baseSchema: basicMarkdownSchema,
    });
    const parsed = result.textParser.parse('~~~typescript\nconst value = 1;\n~~~');

    expect(parsed.firstChild?.type.name).toBe(codeBlockNodeName);
    expect(parsed.firstChild?.attrs[CodeBlockAttrs.Lang]).toBe('typescript');
    expect(parsed.firstChild?.attrs[CodeBlockAttrs.Markup]).toBe('~~~');
    expect(result.serializer.serialize(parsed)).toBe('~~~typescript\nconst value = 1;\n~~~\n');
    expect(result.plugins).toHaveLength(3);
  });

  it('extends a fence that appears in code content', () => {
    const documentNode = basicMarkdownSchema.node('doc', null, [
      basicMarkdownSchema.node('code_block', null, basicMarkdownSchema.text('```')),
    ]);
    const result = ExtensionsManager.process((builder) => builder.use(CodeBlock), { baseSchema: basicMarkdownSchema });

    expect(result.serializer.serialize(documentNode)).toBe('````\n```\n````\n');
  });

  it('converts a text selection to a code block', () => {
    const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('text'));
    const documentNode = basicMarkdownSchema.node('doc', null, [paragraph]);
    const state = EditorState.create({
      doc: documentNode,
      schema: basicMarkdownSchema,
      selection: TextSelection.create(documentNode, 1, 5),
    });
    let next = state;

    expect(
      setCodeBlock(state, (transaction) => {
        next = state.apply(transaction);
      }),
    ).toBe(true);
    expect(next.doc.firstChild?.type.name).toBe(codeBlockNodeName);
  });

  it('updates the language of the current code block', () => {
    const documentNode = basicMarkdownSchema.node('doc', null, [
      basicMarkdownSchema.node('code_block', null, basicMarkdownSchema.text('const value = 1;')),
    ]);
    const state = EditorState.create({
      doc: documentNode,
      selection: TextSelection.create(documentNode, 2),
    });
    let next = state;

    expect(
      setCodeBlockLanguage('typescript')(state, (transaction) => {
        next = state.apply(transaction);
      }),
    ).toBe(true);
    expect(next.doc.firstChild?.attrs[CodeBlockAttrs.Lang]).toBe('typescript');
  });
});
