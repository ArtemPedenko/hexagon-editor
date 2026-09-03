import { EditorState } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { Image, ImageAttr, imageNodeName } from './image';

describe('Image extension', () => {
  it('parses and serializes image alt text, title, and dimensions', () => {
    const result = ExtensionsManager.process((builder) => builder.use(Image), {
      baseSchema: basicMarkdownSchema,
    });
    const parsed = result.textParser.parse('![alt](image.png "title"){width=320 height=180}');

    expect(parsed.firstChild?.firstChild?.type.name).toBe(imageNodeName);
    expect(parsed.firstChild?.firstChild?.attrs[ImageAttr.Alt]).toBe('alt');
    expect(parsed.firstChild?.firstChild?.attrs[ImageAttr.Width]).toBe('320');
    expect(parsed.firstChild?.firstChild?.attrs[ImageAttr.Height]).toBe('180');
    expect(result.serializer.serialize(parsed)).toBe(
      '![alt](image.png "title"){width=320 height=180 object-fit=contain}\n',
    );
  });

  it('turns a pasted image URL into a full-width image', () => {
    const [plugin] = ExtensionsManager.plugins((builder) => builder.use(Image), basicMarkdownSchema);
    const state = EditorState.create({
      plugins: [plugin!],
      schema: basicMarkdownSchema,
    });
    let nextState = state;
    const preventDefault = () => undefined;
    const handled = plugin?.props.handlePaste?.(
      {
        dispatch: (transaction) => {
          nextState = state.apply(transaction);
        },
        state,
      } as never,
      {
        clipboardData: {
          getData: () => 'https://example.com/photo.webp?size=large',
        },
        preventDefault,
      } as ClipboardEvent,
      false,
    );

    expect(handled).toBe(true);
    expect(nextState.doc.firstChild?.firstChild?.attrs[ImageAttr.Src]).toBe(
      'https://example.com/photo.webp?size=large',
    );
    expect(nextState.doc.firstChild?.firstChild?.attrs[ImageAttr.Width]).toBe('100%');
  });
});
