import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { defaultMermaidSource, Mermaid, mermaidActionName, mermaidNodeName } from './mermaid';

describe('Mermaid extension', () => {
  it('parses and serializes Mermaid fences', () => {
    const { serializer, textParser } = ExtensionsManager.process((builder) => builder.use(Mermaid), {
      baseSchema: basicMarkdownSchema,
    });
    const document = textParser.parse('```mermaid\ngraph LR\n  A --> B\n```');

    expect(document.firstChild?.type.name).toBe(mermaidNodeName);
    expect(document.firstChild?.attrs.source).toBe('graph LR\n  A --> B\n');
    expect(serializer.serialize(document)).toContain('```mermaid\ngraph LR\n  A --> B');
  });

  it('registers an action that inserts an editable Mermaid block', () => {
    const document = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('paragraph')]);
    let state = EditorState.create({
      doc: document,
      selection: TextSelection.create(document, 1),
    });
    const action = ExtensionsManager.process((builder) => builder.use(Mermaid), {
      baseSchema: basicMarkdownSchema,
    }).actions.action(mermaidActionName);

    expect(action?.isEnabled({ state })).toBe(true);
    action?.run({
      state,
      dispatch: (transaction) => {
        state = state.apply(transaction);
      },
    });
    expect(state.doc.firstChild?.type.name).toBe(mermaidNodeName);
    expect(state.doc.firstChild?.attrs.source).toBe(defaultMermaidSource);
  });
});
