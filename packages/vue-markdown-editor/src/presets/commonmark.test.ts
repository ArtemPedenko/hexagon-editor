import {describe, expect, it, vi} from 'vitest';

import type {Extension} from '../core/extension-builder';
import {ExtensionsManager} from '../core/extensions-manager';
import {CommonMarkPreset} from './commonmark';
import {CommonMarkSpecsPreset} from './commonmark-specs';

describe('CommonMarkPreset', () => {
    it('registers the standard Markdown schema and actions', () => {
        const result = ExtensionsManager.process((builder) => builder.use(CommonMarkPreset, {}));

        expect(result.schema.nodes.blockquote).toBeDefined();
        expect(result.schema.nodes.bullet_list).toBeDefined();
        expect(result.schema.nodes.image).toBeDefined();
        expect(result.schema.nodes.table).toBeUndefined();
        expect(result.schema.marks.strong).toBeDefined();
        expect(result.schema.marks.strike).toBeUndefined();
        expect(result.serializer.nodes.image).toBeDefined();
    });

    it('allows image and heading to be disabled or replaced', () => {
        const replacement = vi.fn<Extension>();
        const result = ExtensionsManager.process((builder) => builder.use(CommonMarkPreset, {
            heading: replacement,
            image: false,
        }));

        expect(replacement).toHaveBeenCalledOnce();
        expect(result.schema.nodes.image.spec.attrs?.['object-fit']).toBeUndefined();
    });

    it('exposes the specs entry point for the merged Vue extension model', () => {
        const result = ExtensionsManager.process((builder) => builder.use(CommonMarkSpecsPreset, {}));
        expect(result.textParser.parse('**bold**').textContent).toBe('bold');
    });
});
