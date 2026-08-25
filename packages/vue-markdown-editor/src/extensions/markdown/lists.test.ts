import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';
import { createListActions, Lists } from './lists';

describe('Lists extension', () => {
	it('registers upstream list keymaps, input rules and normalization plugins', () => {
		const result = ExtensionsManager.process(
			(builder) => builder.use(Lists, { olKey: 'Mod-Shift-o', ulKey: 'Mod-Shift-u' }),
			{ baseSchema: basicMarkdownSchema },
		);

		expect(result.schema).toBe(basicMarkdownSchema);
		expect(result.plugins).toHaveLength(5);
	});

	it('creates the four upstream list actions for a compatible schema', () => {
		expect(Object.keys(createListActions(basicMarkdownSchema))).toEqual([
			'liftListItem',
			'sinkListItem',
			'toBulletList',
			'toOrderedList',
		]);
	});
});
