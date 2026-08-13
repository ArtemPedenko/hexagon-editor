import {describe, expect, it, vi} from 'vitest';

import {getAdvancedMarkdownRenderers} from './core/optional-renderers';
import {Lang, configure, getConfig, subscribeConfigure} from './configure';

describe('configure', () => {
    it('updates shared configuration, optional renderers and subscribers', () => {
        const subscriber = vi.fn();
        const unsubscribe = subscribeConfigure(subscriber);
        const mermaid = () => document.createElement('div');

        configure({lang: Lang.En, renderers: {mermaid}});

        expect(getConfig().lang).toBe('en');
        expect(getAdvancedMarkdownRenderers().mermaid).toBe(mermaid);
        expect(subscriber).toHaveBeenCalledOnce();
        unsubscribe();
        configure({lang: Lang.Ru});
        expect(subscriber).toHaveBeenCalledOnce();
    });
});
