import {describe, expect, it} from 'vitest';

import {configureAdvancedMarkdownRenderers, getAdvancedMarkdownRenderers} from './optional-renderers';

describe('advanced Markdown renderers', () => {
    it('keeps optional host renderers independent', () => {
        const math = (): HTMLElement => document.createElement('span');
        const mermaid = (): HTMLElement => document.createElement('pre');

        configureAdvancedMarkdownRenderers({math});
        configureAdvancedMarkdownRenderers({mermaid});

        expect(getAdvancedMarkdownRenderers()).toMatchObject({math, mermaid});
    });
});
