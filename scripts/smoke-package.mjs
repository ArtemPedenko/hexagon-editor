import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run after the library build; the consumer installs only the packed artifact.
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const consumer = mkdtempSync(join(tmpdir(), 'hexagon-consumer-'));
const run = (command, args, cwd = consumer) => execFileSync(command, args, { cwd, stdio: 'inherit' });
try {
  run(
    'npm',
    ['pack', '--loglevel=error', '--ignore-scripts', '--pack-destination', consumer],
    join(root, 'packages/vue-markdown-editor'),
  );
  const archive = readdirSync(consumer).find((name) => name.endsWith('.tgz'));
  const vue = JSON.parse(
    readFileSync(join(root, 'packages/vue-markdown-editor/node_modules/vue/package.json')),
  ).version;
  const typescript = JSON.parse(readFileSync(join(root, 'node_modules/typescript/package.json'))).version;
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(consumer, archive),
    'vue@' + vue,
    'typescript@' + typescript,
  ]);
  const manifest = JSON.parse(readFileSync(join(consumer, 'node_modules/hexagon-editor/package.json')));
  const imports = Object.entries(manifest.exports)
    .filter(([, entry]) => typeof entry === 'object')
    .map(([key]) => 'hexagon-editor' + (key === '.' ? '' : key.slice(1)));
  writeFileSync(
    join(consumer, 'index.ts'),
    imports.map((name, index) => `import * as entry${index} from '${name}'; void entry${index};`).join('\n'),
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: false,
        noEmit: true,
      },
      include: ['index.ts'],
    }),
  );
  run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']);
  copyFileSync(join(root, 'scripts/fixtures/packed-consumer.mjs'), join(consumer, 'smoke.mjs'));
  run(process.execPath, ['smoke.mjs']);
  assert.ok(imports.length > 1);
  console.log('Packed imports, declarations, both CSS exports and SSR passed.');
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
