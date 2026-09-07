import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { MarkdownRenderer } from 'hexagon-editor/renderer';

const manifest = JSON.parse(readFileSync(new URL('./node_modules/hexagon-editor/package.json', import.meta.url)));
for (const [key, entry] of Object.entries(manifest.exports)) {
  const name = 'hexagon-editor' + (key === '.' ? '' : key.slice(1));
  if (typeof entry === 'object') {
    assert.ok(Object.keys(await import(name)).length, name);
  } else {
    assert.ok(readFileSync(new URL(import.meta.resolve(name))).length, name);
  }
}

let loads = 0;
const content = '# Packed\n\n```mermaid\ngraph LR\nA --> B\n```';
const html = await renderToString(
  createSSRApp(() =>
    h(MarkdownRenderer, {
      content,
      features: {
        mermaid: {
          load() {
            loads++;
            throw new Error('SSR loader');
          },
        },
      },
    }),
  ),
);
assert.ok(html.includes('<h1>Packed</h1>'));
assert.ok(html.includes('A --&gt; B'));
assert.equal(loads, 0);
