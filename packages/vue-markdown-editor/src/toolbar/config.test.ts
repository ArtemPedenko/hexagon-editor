import { describe, expect, it } from 'vitest';

import type { BasicWysiwygSelectionState } from '../core';
import {
	commonmarkToolbarConfig,
	createToolbarConfig,
	createToolbarGroup,
	createToolbarItem,
	defaultToolbarConfig,
	fullToolbarConfig,
	getToolbarConfig,
	isToolbarItemAvailable,
	minimalToolbarConfig,
	normalizeToolbarItem,
	zeroToolbarConfig,
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
		expect(getToolbarConfig('zero')).toBe(zeroToolbarConfig);
		expect(getToolbarConfig('commonmark')).toBe(commonmarkToolbarConfig);
		expect(getToolbarConfig('full')).toBe(fullToolbarConfig);
		expect(defaultToolbarConfig.groups.flatMap((group) => group.items)).not.toContain('table');
		expect(fullToolbarConfig.groups.flatMap((group) => group.items)).toContain('table');
		expect(minimalToolbarConfig.groups.flatMap((group) => group.items)).not.toContain('table');
	});

	it('creates items, groups and configs without coupling them to Vue', () => {
		const action = { run: () => undefined };
		const toolbarItem = createToolbarItem('bold', { action });
		expect(createToolbarConfig([createToolbarGroup('format', [toolbarItem])])).toEqual({
			groups: [{ id: 'format', items: [{ id: 'bold', action }] }],
		});
	});

	it('applies contextual and consumer availability', () => {
		expect(isToolbarItemAvailable({ id: 'fold-heading' }, state)).toBe(false);
		expect(isToolbarItemAvailable({ id: 'code-language' }, state)).toBe(false);
		expect(isToolbarItemAvailable({ id: 'bold', isAvailable: () => false }, state)).toBe(false);
		expect(isToolbarItemAvailable(normalizeToolbarItem('bold'), state)).toBe(true);
	});
});
