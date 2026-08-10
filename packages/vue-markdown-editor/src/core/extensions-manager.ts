import MarkdownIt from 'markdown-it';
import type {Options as MarkdownItOptions} from 'markdown-it';
import {Schema} from 'prosemirror-model';
import {
    defaultMarkdownParser,
    defaultMarkdownSerializer,
    MarkdownParser,
    MarkdownSerializer,
    schema as defaultMarkdownSchema,
} from 'prosemirror-markdown';
import type {Plugin} from 'prosemirror-state';
import type {ParseSpec} from 'prosemirror-markdown';

import {ActionsManager} from './actions';
import {ExtensionBuilder} from './extension-builder';
import type {
    Extension,
    ExtensionAction,
    ExtensionDeps,
    ExtensionMarkSpec,
    ExtensionNodeSpec,
} from './extension-builder';

export interface ExtensionsManagerOptions {
    baseSchema?: Schema;
    markdown?: MarkdownItOptions;
    parserTokens?: Record<string, ParseSpec>;
}

export interface ExtensionsBuildResult extends ExtensionDeps {
    actions: ActionsManager;
    markupParser: MarkdownParser;
    plugins: Plugin[];
    rawActions: Record<string, ExtensionAction>;
    serializer: MarkdownSerializer;
    textParser: MarkdownParser;
}

/**
 * Assembles the framework-independent part of an upstream extension preset.
 * Vue-specific node and widget views remain consumers of this result.
 */
export class ExtensionsManager {
    static process(extension: Extension, options: ExtensionsManagerOptions = {}): ExtensionsBuildResult {
        return new ExtensionsManager(extension, options).build();
    }

    readonly #extension: Extension;
    readonly #options: ExtensionsManagerOptions;

    constructor(extension: Extension, options: ExtensionsManagerOptions = {}) {
        this.#extension = extension;
        this.#options = options;
    }

    build(): ExtensionsBuildResult {
        const spec = new ExtensionBuilder().use(this.#extension).build();
        const schema = this.createSchema(spec.nodes(), spec.marks());
        const markdownOptions = this.#options.markdown ?? {};
        const markupMarkdown = spec.configureMd(new MarkdownIt('commonmark', {...markdownOptions}), 'markup');
        const textMarkdown = spec.configureMd(new MarkdownIt('commonmark', {...markdownOptions}), 'text');
        const tokens = this.createTokens(spec.nodes(), spec.marks(), spec.parserTokens());
        const serializer = this.createSerializer(
            spec.nodes(),
            spec.marks(),
            spec.serializerNodes(),
            spec.serializerMarks(),
        );
        const deps: ExtensionDeps = {schema};
        const rawActions = spec.actions(deps);

        return {
            ...deps,
            actions: new ActionsManager(rawActions),
            markupParser: new MarkdownParser(schema, markupMarkdown, tokens),
            plugins: spec.plugins(deps),
            rawActions,
            serializer,
            textParser: new MarkdownParser(schema, textMarkdown, tokens),
        };
    }

    private createSchema(
        nodes: ReadonlyMap<string, ExtensionNodeSpec>,
        marks: ReadonlyMap<string, ExtensionMarkSpec>,
    ): Schema {
        const base = this.#options.baseSchema ?? defaultMarkdownSchema;
        if (nodes.size === 0 && marks.size === 0) {
            return base;
        }
        let nodeSpecs = base.spec.nodes;
        let markSpecs = base.spec.marks;
        for (const [name, entry] of nodes) nodeSpecs = nodeSpecs.update(name, entry.spec);
        for (const [name, entry] of marks) markSpecs = markSpecs.update(name, entry.spec);
        return new Schema({marks: markSpecs, nodes: nodeSpecs, topNode: base.spec.topNode});
    }

    private createTokens(
        nodes: ReadonlyMap<string, ExtensionNodeSpec>,
        marks: ReadonlyMap<string, ExtensionMarkSpec>,
        extensionTokens: ReadonlyMap<string, unknown>,
    ) {
        const tokens = {...(this.#options.parserTokens ?? defaultMarkdownParser.tokens)};
        for (const [name, token] of extensionTokens) tokens[name] = token as typeof tokens[string];
        for (const [name, entry] of nodes) {
            if (entry.fromMd !== undefined) tokens[name] = entry.fromMd as typeof tokens[string];
        }
        for (const [name, entry] of marks) {
            if (entry.fromMd !== undefined) tokens[name] = entry.fromMd as typeof tokens[string];
        }
        return tokens;
    }

    private createSerializer(
        nodes: ReadonlyMap<string, ExtensionNodeSpec>,
        marks: ReadonlyMap<string, ExtensionMarkSpec>,
        extensionNodes: ReadonlyMap<string, unknown>,
        extensionMarks: ReadonlyMap<string, unknown>,
    ): MarkdownSerializer {
        const serializerNodes = {...defaultMarkdownSerializer.nodes};
        const serializerMarks = {...defaultMarkdownSerializer.marks};
        for (const [name, entry] of nodes) {
            if (entry.toMd !== undefined) serializerNodes[name] = entry.toMd as typeof serializerNodes[string];
        }
        for (const [name, entry] of marks) {
            if (entry.toMd !== undefined) serializerMarks[name] = entry.toMd as typeof serializerMarks[string];
        }
        for (const [name, token] of extensionNodes) serializerNodes[name] = token as typeof serializerNodes[string];
        for (const [name, token] of extensionMarks) serializerMarks[name] = token as typeof serializerMarks[string];
        return new MarkdownSerializer(serializerNodes, serializerMarks);
    }
}
