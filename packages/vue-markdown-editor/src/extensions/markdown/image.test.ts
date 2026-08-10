import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';

import {Image, ImageAttr, imageNodeName} from './image';

describe('Image extension', () => {
    it('parses and serializes image alt text and title', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Image), {baseSchema: basicMarkdownSchema});
        const parsed = result.textParser.parse('![alt](image.png "title")');

        expect(parsed.firstChild?.firstChild?.type.name).toBe(imageNodeName);
        expect(parsed.firstChild?.firstChild?.attrs[ImageAttr.Alt]).toBe('alt');
        expect(result.serializer.serialize(parsed)).toBe('![alt](image.png "title")\n');
    });
});
