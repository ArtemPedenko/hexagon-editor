import {describe, expect, it} from 'vitest';

import {
    ClicksOnEdges,
    Lang,
    CommonMarkPreset,
    CommonMarkSpecsPreset,
    EditorModeKeymap,
    FullPreset,
    FullSpecsPreset,
    VERSION,
    cn,
    configure,
} from './index';

describe('public package entry point', () => {
    it('exposes the Vue port version', () => {
        expect(VERSION).toBe('0.1.0-alpha.0');
        expect(ClicksOnEdges).toBeTypeOf('function');
        expect(CommonMarkPreset).toBeTypeOf('function');
        expect(CommonMarkSpecsPreset).toBeTypeOf('function');
        expect(EditorModeKeymap).toBeTypeOf('function');
        expect(FullPreset).toBeTypeOf('function');
        expect(FullSpecsPreset).toBeTypeOf('function');
        expect(Lang.En).toBe('en');
        expect(cn).toBeTypeOf('function');
        expect(configure).toBeTypeOf('function');
    });
});
