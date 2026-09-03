import { describe, expect, it } from 'vitest';
import packageJson from '../../../../packages/vue-markdown-editor/package.json';
import { markdownEditorToolbarItemIds } from '../../../../packages/vue-markdown-editor/src/toolbar/config';

import { docPages } from './registry';

describe('documentation registry', () => {
  it('contains fifteen complete, uniquely addressable pages', () => {
    expect(docPages).toHaveLength(15);
    expect(new Set(docPages.map(({ slug }) => slug)).size).toBe(15);
    for (const page of docPages) {
      expect(page.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(page.title.trim()).not.toBe('');
      expect(page.group.trim()).not.toBe('');
      expect(page.description.trim()).not.toBe('');
      expect(page.content.trim()).not.toBe('');
      expect(page.content.trimStart().startsWith('## ')).toBe(true);
      expect(page.content).not.toContain('__underlined__');
    }
    expect(docPages.some((page) => page.content.includes('<script setup lang="ts">'))).toBe(true);
  });

  it('keeps required reference sections on API pages', () => {
    const required: Readonly<Record<string, readonly string[]>> = {
      'editor-api': ['Editor component API', 'Reactiv'],
      headless: ['MarkdownEditorOptions', 'Method'],
      'core-subpaths': ['Core and public subpaths', 'lifecycle'],
      'presets-extensions': ['Presets', 'Option', 'round-trip'],
      'renderer-ssr': ['SSR', 'CSP'],
      images: ['Standalone forms', 'MarkdownEditorImageForm'],
      toolbar: ['Preset', 'BasicWysiwygSelectionState'],
    };

    for (const [slug, sections] of Object.entries(required)) {
      const page = docPages.find((candidate) => candidate.slug === slug);
      expect(page, slug).toBeDefined();
      for (const section of sections) expect(page!.content).toContain(section);
    }
  });

  it('documents only stable toolbar IDs and package subpaths', () => {
    const toolbar = docPages.find(({ slug }) => slug === 'toolbar')!.content;
    for (const id of markdownEditorToolbarItemIds) expect(toolbar).toContain(`\`${id}\``);

    const documentedSubpaths = [
      '/core',
      '/extensions',
      '/specs',
      '/presets',
      '/toolbar',
      '/forms',
      '/renderer',
      '/configure',
      '/classname',
      '/i18n',
    ];
    const exports = Object.keys(packageJson.exports);
    expect(exports).toEqual(expect.arrayContaining(documentedSubpaths.map((path) => `.${path}`)));
  });
});
