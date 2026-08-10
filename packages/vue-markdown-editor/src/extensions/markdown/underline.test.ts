import {describe, expect, it} from 'vitest';
import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';
import {Underline, underlineMarkName} from './underline';
describe('Underline extension', () => {
    it('parses and serializes ++underlined++', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Underline), {baseSchema: basicMarkdownSchema});
        const parsed = result.textParser.parse('++text++');
        expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe(underlineMarkName);
        expect(result.serializer.serialize(parsed)).toBe('++text++\n');
    });
});
