import { describe, expect, it } from 'vitest';

import { EditorState, TextSelection } from 'prosemirror-state';

import { basicMarkdownCodec, basicMarkdownSchema } from '../../core/basic-editor';
import { setBackgroundColorCommand } from '../../core/basic-editor-command-helpers';
import { textBackgroundColorMenuNames } from './background-color';

describe('Background color extension', () => {
  it.each([false, true])('sets and resets color with selection=%s', (selected) => {
    const doc = basicMarkdownCodec.parse('text');
    let state = EditorState.create({ doc, selection: TextSelection.create(doc, 1, selected ? 5 : 1) });
    setBackgroundColorCommand(basicMarkdownSchema, 'red')(state, (tr) => {
      state = state.apply(tr);
    });
    expect(selected ? state.doc.firstChild?.firstChild?.marks[0]?.type.name : state.storedMarks?.[0]?.type.name).toBe(
      'background_color',
    );
    setBackgroundColorCommand(basicMarkdownSchema, 'default')(state, (tr) => {
      state = state.apply(tr);
    });
    expect(basicMarkdownCodec.serialize(state.doc)).toBe('text');
    expect(state.storedMarks ?? []).toEqual([]);
  });
  it('parses and serializes named text backgrounds with nested marks', () => {
    const source = 'Обычный {bg-yellow}(подсвеченный {red}(жирный)) текст';
    const document = basicMarkdownCodec.parse(source);
    const backgroundMark = document.firstChild?.child(1).marks.find((mark) => mark.type.name === 'background_color');

    expect(backgroundMark?.attrs.color).toBe('yellow');
    expect(basicMarkdownCodec.serialize(document)).toBe(source);
  });

  it('keeps an unknown background color as plain text', () => {
    const source = '{bg-unknown}(текст)';

    expect(basicMarkdownCodec.serialize(basicMarkdownCodec.parse(source))).toBe(source);
  });

  it('lists the default background before named colors without parsing it as Markdown', () => {
    expect(textBackgroundColorMenuNames).toEqual([
      'default',
      'gray',
      'yellow',
      'orange',
      'red',
      'green',
      'blue',
      'violet',
    ]);
    expect(basicMarkdownCodec.serialize(basicMarkdownCodec.parse('{bg-default}(текст)'))).toBe('{bg-default}(текст)');
  });

  it('removes the background mark when the default color is selected', () => {
    const document = basicMarkdownCodec.parse('{bg-red}(подсвеченный **жирный**)');
    const state = EditorState.create({
      doc: document,
      schema: basicMarkdownSchema,
      selection: TextSelection.create(document, 1, document.content.size - 1),
    });
    let nextState = state;

    setBackgroundColorCommand(basicMarkdownSchema, 'default')(state, (transaction) => {
      nextState = state.apply(transaction);
    });

    expect(basicMarkdownCodec.serialize(nextState.doc)).toBe('подсвеченный **жирный**');
  });
});
