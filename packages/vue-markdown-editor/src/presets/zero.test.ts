import { describe, expect, it } from 'vitest';

import { ExtensionsManager } from '../core/extensions-manager';
import { ZeroPreset } from './zero';

describe('ZeroPreset', () => {
  it('builds the base schema with upstream keymap and input-rule plugins', () => {
    const result = ExtensionsManager.process((builder) => builder.use(ZeroPreset, {}));

    expect(result.schema.nodes.paragraph).toBeDefined();
    expect(result.plugins).toHaveLength(3);
    expect(result.textParser.parse('Text').textContent).toBe('Text');
  });
});
