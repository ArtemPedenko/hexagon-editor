import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
	dependencies: Record<string, string>;
	exports: Record<string, unknown>;
}

describe('package exports', () => {
	it('publishes only the documented root and stable Vue subpaths', () => {
		const packagePath = resolve(process.cwd(), 'package.json');
		const manifest = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageManifest;

		expect(Object.keys(manifest.exports)).toEqual([
			'.',
			'./classname',
			'./configure',
			'./core',
			'./extensions',
			'./forms',
			'./i18n',
			'./presets',
			'./renderer',
			'./specs',
			'./toolbar',
			'./style.css',
			'./renderer.css',
		]);
		expect(manifest.dependencies.react).toBeUndefined();
		expect(manifest.dependencies['react-dom']).toBeUndefined();
	});
});
