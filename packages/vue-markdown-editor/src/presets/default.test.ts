import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../core/basic-editor';
import {ExtensionsManager} from '../core/extensions-manager';

import {DefaultPreset} from './default';

describe('DefaultPreset', () => {
    it('composes CommonMark with strike and table against the supplied schema', () => {
        const result = ExtensionsManager.process(
            (builder) => builder.use(DefaultPreset, {lists: {ulKey: 'Mod-Shift-u'}}),
            {baseSchema: basicMarkdownSchema},
        );

        expect(result.plugins.length).toBeGreaterThan(0);
        expect(result.schema.nodes.list_item).toBeDefined();
        expect(result.schema.nodes.table).toBeDefined();
        expect(result.schema.marks.strike).toBeDefined();
        expect(result.serializer.marks.mark).toBeUndefined();
    });
});
