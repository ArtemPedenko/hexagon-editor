import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { BreakNodeName, Breaks } from './breaks';

describe('Breaks extension', () => {
  it('serializes hard and soft breaks with their upstream Markdown forms', () => {
    const hardDocument = basicMarkdownSchema.node('doc', null, [
      basicMarkdownSchema.node('paragraph', null, [
        basicMarkdownSchema.text('first'),
        basicMarkdownSchema.nodes.hard_break!.create(),
        basicMarkdownSchema.text('second'),
      ]),
    ]);
    const softDocument = basicMarkdownSchema.node('doc', null, [
      basicMarkdownSchema.node('paragraph', null, [
        basicMarkdownSchema.text('first'),
        basicMarkdownSchema.nodes.soft_break!.create(),
        basicMarkdownSchema.text('second'),
      ]),
    ]);
    const result = ExtensionsManager.process((builder) => builder.use(Breaks), {
      baseSchema: basicMarkdownSchema,
    });

    expect(result.serializer.serialize(hardDocument)).toBe('first\\\nsecond\n');
    expect(result.serializer.serialize(softDocument)).toBe('first\nsecond\n');
    expect(result.plugins).toHaveLength(1);
  });

  it('uses a soft break when configured', () => {
    const result = ExtensionsManager.process((builder) => builder.use(Breaks, { preferredBreak: 'soft' }), {
      baseSchema: basicMarkdownSchema,
    });

    expect(result.schema.nodes[BreakNodeName.SoftBreak]).toBeDefined();
  });
});
