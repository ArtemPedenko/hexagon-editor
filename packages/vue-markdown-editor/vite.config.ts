import {resolve} from 'node:path';

import vue from '@vitejs/plugin-vue';
import {defineConfig} from 'vitest/config';
import dts from 'vite-plugin-dts';

export default defineConfig(({mode}) => {
    const rendererBuild = mode === 'renderer';

    return {
    test: {
        environment: 'jsdom',
    },
    plugins: [vue(), dts({
        entryRoot: resolve(import.meta.dirname, 'src'),
        exclude: ['vite.config.ts', 'src/**/*.test.ts'],
        outDir: resolve(import.meta.dirname, 'dist'),
        tsconfigPath: './tsconfig.json',
    })],
    build: {
        lib: {
            entry: rendererBuild ? resolve(import.meta.dirname, 'src/renderer/index.ts') : {
                classname: resolve(import.meta.dirname, 'src/classname.ts'),
                configure: resolve(import.meta.dirname, 'src/configure.ts'),
                core: resolve(import.meta.dirname, 'src/core/index.ts'),
                extensions: resolve(import.meta.dirname, 'src/extensions/index.ts'),
                forms: resolve(import.meta.dirname, 'src/forms/index.ts'),
                i18n: resolve(import.meta.dirname, 'src/i18n/index.ts'),
                index: resolve(import.meta.dirname, 'src/index.ts'),
                presets: resolve(import.meta.dirname, 'src/presets/index.ts'),
                renderer: resolve(import.meta.dirname, 'src/renderer/index.ts'),
                specs: resolve(import.meta.dirname, 'src/extensions/specs.ts'),
                toolbar: resolve(import.meta.dirname, 'src/toolbar/index.ts'),
            },
            formats: ['es'],
            fileName: (_format, entryName) => rendererBuild ? 'renderer.js' : `${entryName}.js`,
            cssFileName: rendererBuild ? 'renderer' : 'index',
        },
        cssCodeSplit: false,
        emptyOutDir: !rendererBuild,
        rollupOptions: {
            external: ['vue'],
        },
    },
    };
});
