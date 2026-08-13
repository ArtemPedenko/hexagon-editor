import {describe, expect, it} from 'vitest';

import {cn} from './classname';

describe('cn', () => {
    it('creates upstream-compatible block, element, modifier and mix classes', () => {
        const block = cn('editor');

        expect(block()).toBe('g-md-editor');
        expect(block({disabled: false, mode: 'split', toolbar: true}, ['host', undefined]))
            .toBe('g-md-editor g-md-editor_mode_split g-md-editor_toolbar host');
        expect(block('button', {active: true}, 'custom')).toBe('g-md-editor__button g-md-editor__button_active custom');
    });
});
