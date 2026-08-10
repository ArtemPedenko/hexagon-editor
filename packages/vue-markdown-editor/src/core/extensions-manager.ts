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
import {ParserTokensRegistry, SerializerTokensRegistry} from './registries';
import type {SchemaSpecModifier} from './registries';

export interface ExtensionsManagerOptions {
    baseSchema?: Schema;
    markdown?: MarkdownItOptions;
    parserTokens?: Record<string, ParseSpec>;
    schemaModifier?: SchemaSpecModifier;
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
    static plugins(extension: Extension, schema: Schema): Plugin[] {
        return new ExtensionBuilder().use(extension).build().plugins({schema});
    }

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
        if (nodes.size === 0 && marks.size === 0 && this.#options.schemaModifier === undefined) {
            return base;
        }
        let nodeSpecs = base.spec.nodes;
        let markSpecs = base.spec.marks;
        if (this.#options.schemaModifier !== undefined) {
            base.spec.nodes.forEach((name, spec) => {
                nodeSpecs = nodeSpecs.update(
                    name,
                    this.#options.schemaModifier?.processNodeSpec(name, spec) ?? spec,
                );
            });
        }
        for (const [name, entry] of nodes) nodeSpecs = nodeSpecs.update(name, entry.spec);
        for (const [name, entry] of marks) markSpecs = markSpecs.update(name, entry.spec);
        return new Schema({marks: markSpecs, nodes: nodeSpecs, topNode: base.spec.topNode});
    }

    private createTokens(
        nodes: ReadonlyMap<string, ExtensionNodeSpec>,
        marks: ReadonlyMap<string, ExtensionMarkSpec>,
        extensionTokens: ReadonlyMap<string, unknown>,
    ) {
        const registry = new ParserTokensRegistry();
        for (const [name, token] of Object.entries(this.#options.parserTokens ?? defaultMarkdownParser.tokens)) {
            registry.addToken(name, token);
        }
        for (const [name, token] of extensionTokens) registry.addToken(name, token as ParseSpec);
        for (const [name, entry] of nodes) {
            if (entry.fromMd !== undefined) registry.addToken(name, entry.fromMd as ParseSpec);
        }
        for (const [name, entry] of marks) {
            if (entry.fromMd !== undefined) registry.addToken(name, entry.fromMd as ParseSpec);
        }
        return registry.tokens();
    }

    private createSerializer(
        nodes: ReadonlyMap<string, ExtensionNodeSpec>,
        marks: ReadonlyMap<string, ExtensionMarkSpec>,
        extensionNodes: ReadonlyMap<string, unknown>,
        extensionMarks: ReadonlyMap<string, unknown>,
    ): MarkdownSerializer {
        const registry = new SerializerTokensRegistry();
        for (const [name, token] of Object.entries(defaultMarkdownSerializer.nodes)) registry.addNode(name, token);
        for (const [name, token] of Object.entries(defaultMarkdownSerializer.marks)) registry.addMark(name, token);
        for (const [name, entry] of nodes) {
            if (entry.toMd !== undefined) registry.addNode(name, entry.toMd as Parameters<typeof MarkdownSerializer>[0][string]);
        }
        for (const [name, entry] of marks) {
            if (entry.toMd !== undefined) registry.addMark(name, entry.toMd as Parameters<typeof MarkdownSerializer>[1][string]);
        }
        for (const [name, token] of extensionNodes) registry.addNode(name, token as Parameters<typeof MarkdownSerializer>[0][string]);
        for (const [name, token] of extensionMarks) registry.addMark(name, token as Parameters<typeof MarkdownSerializer>[1][string]);
        return registry.createSerializer();
    }
}
