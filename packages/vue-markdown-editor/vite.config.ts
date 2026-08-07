import {resolve} from 'node:path';

import vue from '@vitejs/plugin-vue';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import {libInjectCss} from 'vite-plugin-lib-inject-css';

export default defineConfig({
    plugins: [vue(), libInjectCss(), dts({tsconfigPath: './tsconfig.json'})],
    build: {
        lib: {
            entry: resolve(import.meta.dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            external: ['vue'],
        },
    },
});
