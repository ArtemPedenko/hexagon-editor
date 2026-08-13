import {describe, expect, it} from 'vitest';

import {ClicksOnEdges, EditorModeKeymap, VERSION} from './index';

describe('public package entry point', () => {
    it('exposes the Vue port version', () => {
        expect(VERSION).toBe('0.1.0-alpha.0');
        expect(ClicksOnEdges).toBeTypeOf('function');
        expect(EditorModeKeymap).toBeTypeOf('function');
    });
});
