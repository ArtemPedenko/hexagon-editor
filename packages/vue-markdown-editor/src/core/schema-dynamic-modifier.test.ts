import { describe, expect, it } from 'vitest';

import { ExtensionsManager } from './extensions-manager';
import { SchemaDynamicModifier } from './schema-dynamic-modifier';

describe('SchemaDynamicModifier', () => {
  it('adds declared nullable attrs before the schema is created', () => {
    const result = ExtensionsManager.process((builder) => builder.configureMd((markdown) => markdown), {
      schemaModifier: new SchemaDynamicModifier({
        paragraph: { allowedAttrs: ['data-source'] },
      }),
    });

    expect(result.schema.nodes.paragraph?.spec.attrs?.['data-source']?.default).toBeNull();
  });
});
