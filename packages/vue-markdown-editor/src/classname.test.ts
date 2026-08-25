import { describe, expect, it } from 'vitest';

import { cn } from './classname';

describe('cn', () => {
	it('creates upstream-compatible block, element, modifier and mix classes', () => {
		const block = cn('editor');

		expect(block()).toBe('hx-md-editor');
		expect(block({ disabled: false, mode: 'split', toolbar: true }, ['host', undefined])).toBe(
			'hx-md-editor hx-md-editor_mode_split hx-md-editor_toolbar host',
		);
		expect(block('button', { active: true }, 'custom')).toBe('hx-md-editor__button hx-md-editor__button_active custom');
	});
});
