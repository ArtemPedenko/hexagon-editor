import MarkdownIt from 'markdown-it';
import { Plugin, PluginKey } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from './basic-editor';
import { ExtensionBuilder, ExtensionPriority } from './extension-builder';

describe('ExtensionBuilder', () => {
	it('collects nodes, Markdown configuration, actions and prioritized plugins', () => {
		const firstPlugin = new PluginKey('first');
		const secondPlugin = new PluginKey('second');
		const pluginOrder: string[] = [];
		const builder = new ExtensionBuilder();

		builder
			.configureMd((markdown) => markdown.enable('table'), { text: true })
			.addNode('example', () => ({ spec: { group: 'block' } }))
			.addParserToken('example_token', { node: 'example' })
			.addNodeSerializer('example', () => undefined)
			.addMarkSerializer('em', { close: '*', open: '*' })
			.addPlugin(() => {
				pluginOrder.push('first');
				return new Plugin({ key: firstPlugin });
			}, ExtensionPriority.Low)
			.addPlugin(() => {
				pluginOrder.push('second');
				return new Plugin({ key: secondPlugin });
			}, ExtensionPriority.High)
			.addAction('example', () => ({
				isActive: () => false,
				isEnabled: () => true,
				metadata: () => undefined,
				run: () => undefined,
			}));

		const spec = builder.build();
		const markdown = spec.configureMd(new MarkdownIt('commonmark'), 'text');
		const plugins = spec.plugins({ schema: basicMarkdownSchema });

		expect(spec.nodes().get('example')?.spec.group).toBe('block');
		expect(spec.parserTokens().get('example_token')).toEqual({
			node: 'example',
		});
		expect(spec.serializerNodes().get('example')).toBeTypeOf('function');
		expect(spec.serializerMarks().get('em')).toEqual({ close: '*', open: '*' });
		expect(markdown.options).toBeDefined();
		expect(plugins).toHaveLength(2);
		expect(pluginOrder).toEqual(['second', 'first']);
		expect(spec.actions({ schema: basicMarkdownSchema }).example?.isEnabled(undefined)).toBe(true);
	});

	it('rejects duplicate extension entities and actions', () => {
		const builder = new ExtensionBuilder().addNode('example', () => ({
			spec: { group: 'block' },
		}));

		expect(() => builder.addNode('example', () => ({ spec: { group: 'block' } }))).toThrow('already exists');
		builder.addAction('example', () => ({
			isActive: () => false,
			isEnabled: () => true,
			metadata: () => undefined,
			run: () => undefined,
		}));
		expect(() =>
			builder.addAction('example', () => ({
				isActive: () => false,
				isEnabled: () => true,
				metadata: () => undefined,
				run: () => undefined,
			})),
		).toThrow('already registered');
	});

	it('keeps upstream mark priority when creating a schema', () => {
		const builder = new ExtensionBuilder()
			.addMarkSpec('low', () => ({ toDOM: () => ['low', 0] }), ExtensionPriority.Low)
			.addMarkSpec('high', () => ({ toDOM: () => ['high', 0] }), ExtensionPriority.High);

		expect([...builder.build().marks()].map(([name]) => name)).toEqual(['high', 'low']);
	});

	it('overrides granular parser and serializer registrations', () => {
		const builder = new ExtensionBuilder()
			.addNodeSpec('example', () => ({ group: 'block' }))
			.addMarkdownTokenParserSpec('example_token', () => ({ node: 'example' }))
			.addNodeSerializerSpec('example', () => 'initial')
			.overrideNodeSpec('example', (previous) => ({ ...previous, atom: true }))
			.overrideMarkdownTokenParserSpec('example_token', () => ({
				node: 'updated',
			}))
			.overrideNodeSerializerSpec('example', () => 'updated');
		const spec = builder.build();

		expect(spec.nodes().get('example')?.spec.atom).toBe(true);
		expect(spec.parserTokens().get('example_token')).toEqual({
			node: 'updated',
		});
		expect(spec.serializerNodes().get('example')).toBe('updated');
	});
});
