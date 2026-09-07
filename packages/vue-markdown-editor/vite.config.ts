import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
const require = createRequire(import.meta.url);

export default defineConfig(({ mode }) => {
  const rendererBuild = mode === 'renderer';

  return {
    test: {
      environment: 'jsdom',
    },
    plugins: [
      vue(),
      {
        name: 'checked-declarations',
        apply: 'build',
        closeBundle() {
          // Use the same Vue type compiler as typecheck. Its nonzero exit
          // fails either build stage, including direct Vite invocations.
          execFileSync(process.execPath, [require.resolve('vue-tsc/bin/vue-tsc.js'), '-p', 'tsconfig.build.json'], {
            cwd: import.meta.dirname,
            stdio: 'inherit',
          });
          // Flat JS entry points take precedence over directory index types.
          for (const name of ['core', 'extensions', 'forms', 'i18n', 'presets', 'renderer', 'toolbar']) {
            writeFileSync(resolve(import.meta.dirname, 'dist', name + '.d.ts'), `export * from './${name}/index';\n`);
          }
        },
      },
    ],
    build: {
      lib: {
        entry: rendererBuild
          ? resolve(import.meta.dirname, 'src/renderer/index.ts')
          : {
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
        fileName: (_format, entryName) => (rendererBuild ? 'renderer.js' : `${entryName}.js`),
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
