import { describe, expect, it } from 'vitest';
import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';
import { Strike, strikeMarkName } from './strike';
describe('Strike extension', () => {
  it('parses and serializes ~~strike~~', () => {
    const result = ExtensionsManager.process((builder) => builder.use(Strike), {
      baseSchema: basicMarkdownSchema,
    });
    const parsed = result.textParser.parse('~~strike~~');
    expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe(strikeMarkName);
    expect(result.serializer.serialize(parsed)).toBe('~~strike~~\n');
  });
});
