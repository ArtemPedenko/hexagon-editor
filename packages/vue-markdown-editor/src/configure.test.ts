import { describe, expect, it, vi } from 'vitest';

import { Lang, configure, getConfig, subscribeConfigure } from './configure';

describe('configure', () => {
	it('updates shared configuration and subscribers', () => {
		const subscriber = vi.fn();
		const unsubscribe = subscribeConfigure(subscriber);
		configure({ lang: Lang.En });

		expect(getConfig().lang).toBe('en');
		expect(subscriber).toHaveBeenCalledOnce();
		unsubscribe();
		configure({ lang: Lang.Ru });
		expect(subscriber).toHaveBeenCalledOnce();
	});
});
