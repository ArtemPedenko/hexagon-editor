import {Plugin, PluginKey} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {ExtensionsManager} from './extensions-manager';
import {basicMarkdownSchema} from './basic-editor';

describe('ExtensionsManager', () => {
    it('keeps the base schema identity when an extension only configures Markdown', () => {
        const result = ExtensionsManager.process(
            (builder) => builder.configureMd((markdown) => markdown),
            {baseSchema: basicMarkdownSchema},
        );

        expect(result.schema).toBe(basicMarkdownSchema);
    });

    it('builds schema, parser, serializer, plugins and actions from an extension', () => {
        const pluginKey = new PluginKey('extension-manager');
        const result = ExtensionsManager.process((builder) => {
            builder
                .configureMd((markdown) => markdown.set({html: true}), {markup: false, text: true})
                .addMark('underline', () => ({
                    fromMd: {mark: 'underline'},
                    spec: {parseDOM: [{tag: 'u'}], toDOM: () => ['u', 0]},
                    toMd: {close: '</u>', open: '<u>'},
                }))
                .addPlugin(() => new Plugin({key: pluginKey}))
                .addAction('underline', () => ({
                    isActive: () => false,
                    isEnabled: () => true,
                    metadata: () => undefined,
                    run: () => undefined,
                }));
        });

        expect(result.schema.marks.underline).toBeDefined();
        expect(result.textParser.tokenizer.options.html).toBe(true);
        expect(result.plugins).toHaveLength(1);
        expect(result.actions.action('underline')?.isEnabled(undefined)).toBe(true);
        expect(result.serializer.serialize(result.textParser.parse('Text'))).toBe('Text');
    });
});
