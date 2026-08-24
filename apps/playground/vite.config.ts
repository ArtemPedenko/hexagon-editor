import {fileURLToPath, URL} from 'node:url';

import vue from '@vitejs/plugin-vue';
import {defineConfig} from 'vite';

export default defineConfig({
	base: '/hexagon-editor/',
    optimizeDeps: {
        include: ['hexagon-editor > mermaid', 'hexagon-editor > prosemirror-tables'],
    },
    plugins: [vue()],
    resolve: {
        alias: [
            {
                find: 'hexagon-editor/renderer',
                replacement: fileURLToPath(
                    new URL('../../packages/vue-markdown-editor/src/renderer/index.ts', import.meta.url),
                ),
            },
            {
                find: /^hexagon-editor$/,
                replacement: fileURLToPath(
                    new URL('../../packages/vue-markdown-editor/src/index.ts', import.meta.url),
                ),
            },
        ],
    },
});
