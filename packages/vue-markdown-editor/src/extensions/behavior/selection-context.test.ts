import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { SelectionContext } from './selection-context';

describe('SelectionContext extension', () => {
  it('registers the Vue context panel only when a component is configured', () => {
    const component = defineComponent({ template: '<div />' });
    const withoutComponent = ExtensionsManager.plugins(
      (builder) => builder.use(SelectionContext, {}),
      basicMarkdownSchema,
    );
    const withComponent = ExtensionsManager.plugins(
      (builder) => builder.use(SelectionContext, { component }),
      basicMarkdownSchema,
    );

    expect(withoutComponent).toHaveLength(0);
    expect(withComponent).toHaveLength(1);
  });
});
