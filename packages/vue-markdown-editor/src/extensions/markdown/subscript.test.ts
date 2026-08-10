import {describe, expect, it} from 'vitest';
import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';
import {Subscript, subscriptMarkName} from './subscript';
describe('Subscript extension', () => {
    it('parses and serializes ~subscript~', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Subscript), {baseSchema: basicMarkdownSchema});
        const parsed = result.textParser.parse('~sub~');
        expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe(subscriptMarkName);
        expect(result.serializer.serialize(parsed)).toBe('~sub~\n');
    });
});
