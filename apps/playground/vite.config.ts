import {fileURLToPath, URL} from 'node:url';

import vue from '@vitejs/plugin-vue';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            'hexagon-editor': fileURLToPath(
                new URL('../../packages/vue-markdown-editor/src/index.ts', import.meta.url),
            ),
        },
    },
});
