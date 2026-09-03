import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { Mark, markMarkName } from './mark';

describe('Mark extension', () => {
  it('parses and serializes ==highlight== Markdown', () => {
    const result = ExtensionsManager.process((builder) => builder.use(Mark), {
      baseSchema: basicMarkdownSchema,
    });
    const parsed = result.textParser.parse('==highlight==');

    expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe(markMarkName);
    expect(result.serializer.serialize(parsed)).toBe('==highlight==\n');
    expect(result.plugins).toHaveLength(1);
  });
});
