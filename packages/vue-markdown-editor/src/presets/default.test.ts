import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../core/basic-editor';
import {ExtensionsManager} from '../core/extensions-manager';

import {DefaultPreset} from './default';

describe('DefaultPreset', () => {
    it('composes zero and lists plugins against the supplied schema', () => {
        const result = ExtensionsManager.process(
            (builder) => builder.use(DefaultPreset, {lists: {ulKey: 'Mod-Shift-u'}}),
            {baseSchema: basicMarkdownSchema},
        );

        expect(result.plugins).toHaveLength(21);
        expect(result.schema.nodes.list_item).toBeDefined();
    });
});
