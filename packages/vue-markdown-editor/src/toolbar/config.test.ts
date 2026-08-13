import {describe, expect, it} from 'vitest';

import type {BasicWysiwygSelectionState} from '../core';
import {
    defaultToolbarConfig,
    getToolbarConfig,
    isToolbarItemAvailable,
    minimalToolbarConfig,
    normalizeToolbarItem,
} from './config';

const state = {
    codeBlock: false,
    headingLevel: undefined,
    image: false,
} as BasicWysiwygSelectionState;

describe('toolbar config', () => {
    it('resolves the built-in presets', () => {
        expect(getToolbarConfig('default')).toBe(defaultToolbarConfig);
        expect(getToolbarConfig('minimal')).toBe(minimalToolbarConfig);
        expect(defaultToolbarConfig.groups.flatMap((group) => group.items)).toContain('table');
        expect(minimalToolbarConfig.groups.flatMap((group) => group.items)).not.toContain('table');
    });

    it('applies contextual and consumer availability', () => {
        expect(isToolbarItemAvailable({id: 'fold-heading'}, state)).toBe(false);
        expect(isToolbarItemAvailable({id: 'code-language'}, state)).toBe(true);
        expect(isToolbarItemAvailable({id: 'bold', isAvailable: () => false}, state)).toBe(false);
        expect(isToolbarItemAvailable(normalizeToolbarItem('bold'), state)).toBe(true);
    });
});
