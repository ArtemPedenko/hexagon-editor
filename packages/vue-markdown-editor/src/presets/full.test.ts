import { describe, expect, it } from 'vitest';

import { ExtensionsManager } from '../core/extensions-manager';
import { FullPreset } from './full';
import { FullSpecsPreset } from './full-specs';

describe('FullPreset', () => {
  it('adds every applicable extension in the agreed Vue port scope', () => {
    const result = ExtensionsManager.process((builder) => builder.use(FullPreset, {}));

    expect(result.schema.nodes.table).toBeDefined();
    expect(result.schema.nodes.math_block).toBeDefined();
    expect(result.schema.nodes.mermaid).toBeDefined();
    expect(result.schema.nodes.yfm_html_block).toBeDefined();
    expect(result.schema.marks.mark).toBeDefined();
    expect(result.schema.marks.ins).toBeDefined();
    expect(result.schema.marks.sub).toBeDefined();
    expect(result.rawActions.createMermaid).toBeDefined();
  });

  it('exposes the specs entry point for the merged Vue extension model', () => {
    const result = ExtensionsManager.process((builder) => builder.use(FullSpecsPreset, {}));
    expect(result.serializer.serialize(result.textParser.parse('==marked=='))).toContain('==marked==');
  });
});
