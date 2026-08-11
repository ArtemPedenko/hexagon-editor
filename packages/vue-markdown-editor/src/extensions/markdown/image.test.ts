import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';

import {Image, ImageAttr, imageNodeName} from './image';

describe('Image extension', () => {
    it('parses and serializes image alt text, title, and dimensions', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Image), {baseSchema: basicMarkdownSchema});
        const parsed = result.textParser.parse('![alt](image.png "title"){width=320 height=180}');

        expect(parsed.firstChild?.firstChild?.type.name).toBe(imageNodeName);
        expect(parsed.firstChild?.firstChild?.attrs[ImageAttr.Alt]).toBe('alt');
        expect(parsed.firstChild?.firstChild?.attrs[ImageAttr.Width]).toBe('320');
        expect(parsed.firstChild?.firstChild?.attrs[ImageAttr.Height]).toBe('180');
        expect(result.serializer.serialize(parsed)).toBe('![alt](image.png "title"){width=320 height=180 object-fit=contain}\n');
    });
});
