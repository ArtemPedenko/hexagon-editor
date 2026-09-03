import { describe, expect, it } from 'vitest';

import { EditorState, TextSelection } from 'prosemirror-state';

import { basicMarkdownCodec, basicMarkdownSchema } from '../../core/basic-editor';
import { setColorCommand } from '../../core/basic-editor-command-helpers';
import { textColorMenuNames } from './color';

describe('Color extension', () => {
  it('parses and serializes named text colors with nested marks', () => {
    const source = 'Обычный {red}(красный **жирный**) текст';
    const document = basicMarkdownCodec.parse(source);
    const colorMark = document.firstChild?.child(1).marks.find((mark) => mark.type.name === 'color');

    expect(colorMark?.attrs.color).toBe('red');
    expect(basicMarkdownCodec.serialize(document)).toBe(source);
  });

  it('keeps an unknown color as plain text', () => {
    const source = '{unknown}(текст)';

    expect(basicMarkdownCodec.serialize(basicMarkdownCodec.parse(source))).toBe(source);
  });

  it('lists the default color before named colors without parsing it as a Markdown color', () => {
    expect(textColorMenuNames).toEqual(['default', 'gray', 'yellow', 'orange', 'red', 'green', 'blue', 'violet']);
    expect(basicMarkdownCodec.serialize(basicMarkdownCodec.parse('{default}(текст)'))).toBe('{default}(текст)');
  });

  it('removes the color mark when the default color is selected', () => {
    const document = basicMarkdownCodec.parse('{red}(красный **жирный**)');
    const state = EditorState.create({
      doc: document,
      schema: basicMarkdownSchema,
      selection: TextSelection.create(document, 1, document.content.size - 1),
    });
    let nextState = state;

    setColorCommand(basicMarkdownSchema, 'default')(state, (transaction) => {
      nextState = state.apply(transaction);
    });

    expect(basicMarkdownCodec.serialize(nextState.doc)).toBe('красный **жирный**');
  });

  it('clears the stored color mark when the default color is selected at the cursor', () => {
    const document = basicMarkdownCodec.parse('текст');
    const colorMark = basicMarkdownSchema.marks.color.create({ color: 'red' });
    let state = EditorState.create({
      doc: document,
      schema: basicMarkdownSchema,
      selection: TextSelection.create(document, 3),
    });
    state = state.apply(state.tr.addStoredMark(colorMark));
    let nextState = state;

    setColorCommand(basicMarkdownSchema, 'default')(state, (transaction) => {
      nextState = state.apply(transaction);
    });

    expect(nextState.storedMarks).toEqual([]);
  });
});
