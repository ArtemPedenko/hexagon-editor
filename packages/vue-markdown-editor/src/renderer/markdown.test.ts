import {describe, expect, it} from 'vitest';

import {renderMarkdownContent} from './markdown';

describe('renderMarkdownContent', () => {
    it('renders the Markdown dialect emitted by the editor', () => {
        const result = renderMarkdownContent([
            '# Title {#intro .lead}',
            '',
            '==marked== ++inserted++ H~2~O',
            '',
            '| Name | Value |',
            '| --- | --- |',
            '| Vue | 3 |',
            '',
            '![Image](image.png){width=50% height=120 object-fit=cover}',
            '',
            '[External](https://example.com) {target="_blank" rel="noopener noreferrer"}',
        ].join('\n'));

        expect(result).toContain('<h1 id="intro" class="lead">Title</h1>');
        expect(result).toContain('<mark>marked</mark>');
        expect(result).toContain('<ins>inserted</ins>');
        expect(result).toContain('<sub>2</sub>');
        expect(result).toContain('<table>');
        expect(result).toContain('style="width: 50%; height: 120px; object-fit: cover"');
        expect(result).toContain('target="_blank" rel="noopener noreferrer"');
    });

    it('renders only the spaced HTML directive and keeps other HTML as source', () => {
        const result = renderMarkdownContent([
            '<script>raw()</script>',
            '',
            ':::html',
            '<section data-first>First</section>',
            ':::',
            '',
            '::: html',
            '<section data-second>Second</section>',
            ':::',
        ].join('\n'));

        expect(result).toContain('<div data-raw-html>&lt;script&gt;raw()&lt;/script&gt;');
        expect(result).not.toContain('<script>');
        expect(result).toContain('<p data-yfm-html>:::html<br>&lt;section data-first&gt;First&lt;/section&gt;<br>:::</p>');
        expect(result).not.toContain('<section data-first>');
        expect(result).toContain('<section data-second>Second</section>');
    });

    it('keeps inline raw HTML escaped while preserving editor-owned underline markup', () => {
        const result = renderMarkdownContent('Before <img src=x onerror=alert(1)> <u>underlined</u> after');

        expect(result).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(result).not.toContain('<img');
        expect(result).toContain('<u>underlined</u>');
    });

    it('renders formulas and keeps invalid formulas recoverable', () => {
        const result = renderMarkdownContent('Inline $E = mc^2$\n\n$$\nnot valid \\invalid{\n$$');

        expect(result).toContain('class="katex"');
        expect(result).toContain('data-math-error');
        expect(result).toContain('not valid');
    });

    it('groups folding headings into nested interactive sections', () => {
        const result = renderMarkdownContent('##+ Parent\n\nBody\n\n###+ Child\n\nNested\n\n## Next');

        expect(result).toContain('<details data-folding-section open><summary><h2 data-folding="true">Parent</h2>\n</summary>');
        expect(result).toContain('<details data-folding-section open><summary><h3 data-folding="true">Child</h3>\n</summary>');
        expect(result).toContain('</details></details><h2>Next</h2>');
    });

    it('emits an SSR-stable Mermaid fallback', () => {
        const result = renderMarkdownContent('```mermaid\ngraph LR\n  A --> B\n```');

        expect(result).toContain('<div data-mermaid aria-busy="true"><pre>graph LR');
        expect(result).toContain('A --&gt; B');
    });
});
