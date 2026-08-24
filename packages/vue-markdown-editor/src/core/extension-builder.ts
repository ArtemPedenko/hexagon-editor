import type MarkdownIt from 'markdown-it';
import {inputRules} from 'prosemirror-inputrules';
import {keymap} from 'prosemirror-keymap';
import type {MarkSpec, NodeSpec, Schema} from 'prosemirror-model';
import type {Plugin} from 'prosemirror-state';

import type {EditorAction} from './actions';

export enum ExtensionPriority {
    Highest = 1_000_000,
    VeryHigh = 100_000,
    High = 10_000,
    Medium = 1_000,
    Low = 100,
    VeryLow = 10,
    Lowest = 0,
}

export interface ExtensionDeps {
    readonly schema: Schema;
}

export type ExtensionAction = EditorAction<unknown, unknown>;
export type Extension = (builder: ExtensionBuilder) => void;
export type ExtensionWithOptions<Options> = (builder: ExtensionBuilder, options: Options) => void;
export type ExtensionAuto<Options = void> = Options extends void ? Extension : ExtensionWithOptions<Options>;
export type ExtensionKeymap = Record<string, Parameters<typeof keymap>[0][string]>;

export interface ExtensionNodeSpec {
    fromMd?: unknown;
    spec: NodeSpec;
    toMd?: unknown;
}

export interface ExtensionMarkSpec {
    fromMd?: unknown;
    spec: MarkSpec;
    toMd?: unknown;
}

export interface ExtensionSpec {
    configureMd(markdown: MarkdownIt, parserType: 'markup' | 'text'): MarkdownIt;
    marks(): ReadonlyMap<string, ExtensionMarkSpec>;
    nodes(): ReadonlyMap<string, ExtensionNodeSpec>;
    parserTokens(): ReadonlyMap<string, unknown>;
    serializerMarks(): ReadonlyMap<string, unknown>;
    serializerNodes(): ReadonlyMap<string, unknown>;
    plugins(deps: ExtensionDeps): Plugin[];
    actions(deps: ExtensionDeps): Record<string, ExtensionAction>;
}

type MarkdownConfig = {callback: (markdown: MarkdownIt) => MarkdownIt; markup: boolean; text: boolean};
type PrioritizedFactory<Output> = {factory: (deps: ExtensionDeps) => Output; priority: ExtensionPriority};

/**
 * Vue-compatible port of the upstream registration contract. It intentionally
 * only collects extension declarations: schema/parser assembly belongs to the
 * ExtensionsManager layer that consumes this spec.
 */
export class ExtensionBuilder {
    static readonly Priority = ExtensionPriority;

    readonly Priority = ExtensionPriority;
    readonly #actions: Array<[string, (deps: ExtensionDeps) => ExtensionAction]> = [];
    readonly #inputRules: Array<PrioritizedFactory<Parameters<typeof inputRules>[0]>> = [];
    readonly #keymaps: Array<PrioritizedFactory<ExtensionKeymap>> = [];
    readonly #marks = new Map<string, ExtensionMarkSpec>();
    readonly #markPriorities = new Map<string, ExtensionPriority>();
    readonly #markdownConfigs: MarkdownConfig[] = [];
    readonly #nodes = new Map<string, ExtensionNodeSpec>();
    readonly #parserTokens = new Map<string, unknown>();
    readonly #serializerMarks = new Map<string, unknown>();
    readonly #serializerNodes = new Map<string, unknown>();
    readonly #plugins: Array<PrioritizedFactory<Plugin | Plugin[]>> = [];

    use(extension: Extension): this;
    use<Options>(extension: ExtensionWithOptions<Options>, options: Options): this;
    use<Options>(extension: ExtensionWithOptions<Options>, options?: Options): this {
        extension(this, options as Options);
        return this;
    }

    configureMd(
        callback: (markdown: MarkdownIt) => MarkdownIt,
        options: {markup?: boolean; text?: boolean} = {},
    ): this {
        this.#markdownConfigs.push({
            callback,
            markup: options.markup ?? true,
            text: options.text ?? true,
        });
        return this;
    }

    addNode(name: string, factory: () => ExtensionNodeSpec): this {
        this.assertUnique(this.#nodes, name, 'node');
        this.#nodes.set(name, factory());
        return this;
    }

    addMark(name: string, factory: () => ExtensionMarkSpec, priority = ExtensionPriority.Medium): this {
        this.assertUnique(this.#marks, name, 'mark');
        this.#marks.set(name, factory());
        this.#markPriorities.set(name, priority);
        return this;
    }

    addPlugin(
        factory: (deps: ExtensionDeps) => Plugin | Plugin[],
        priority = ExtensionPriority.Medium,
    ): this {
        this.#plugins.push({factory, priority});
        return this;
    }

    addKeymap(factory: (deps: ExtensionDeps) => ExtensionKeymap, priority = ExtensionPriority.Medium): this {
        this.#keymaps.push({factory, priority});
        return this;
    }

    addInputRules(
        factory: (deps: ExtensionDeps) => Parameters<typeof inputRules>[0],
        priority = ExtensionPriority.Medium,
    ): this {
        this.#inputRules.push({factory, priority});
        return this;
    }

    addAction(name: string, factory: (deps: ExtensionDeps) => ExtensionAction): this {
        if (this.#actions.some(([registeredName]) => registeredName === name)) {
            throw new Error(`Action with name "${name}" is already registered`);
        }
        this.#actions.push([name, factory]);
        return this;
    }

    addParserToken(name: string, token: unknown): this {
        if (this.#parserTokens.has(name)) {
            throw new Error(`Markdown parser token with name "${name}" is already registered`);
        }
        this.#parserTokens.set(name, token);
        return this;
    }

    addNodeSerializer(name: string, token: unknown): this {
        this.assertSerializerUnique(this.#serializerNodes, name, 'node');
        this.#serializerNodes.set(name, token);
        return this;
    }

    addMarkSerializer(name: string, token: unknown): this {
        this.assertSerializerUnique(this.#serializerMarks, name, 'mark');
        this.#serializerMarks.set(name, token);
        return this;
    }

    /** Upstream granular extension API for a schema-only node declaration. */
    addNodeSpec(name: string, factory: () => NodeSpec): this {
        return this.addNode(name, () => ({spec: factory()}));
    }

    /** Upstream granular extension API for a schema-only mark declaration. */
    addMarkSpec(name: string, factory: () => MarkSpec, priority = ExtensionPriority.Medium): this {
        return this.addMark(name, () => ({spec: factory()}), priority);
    }

    addMarkdownTokenParserSpec(name: string, factory: () => unknown): this {
        return this.addParserToken(name, factory());
    }

    addNodeSerializerSpec(name: string, factory: () => unknown): this {
        return this.addNodeSerializer(name, factory());
    }

    addMarkSerializerSpec(name: string, factory: () => unknown): this {
        return this.addMarkSerializer(name, factory());
    }

    overrideNodeSpec(name: string, factory: (previous: NodeSpec) => NodeSpec): this {
        const current = this.#nodes.get(name);
        if (current === undefined) {
            throw new Error(`Cannot override node spec "${name}": it is not registered`);
        }
        this.#nodes.set(name, {...current, spec: factory(current.spec)});
        return this;
    }

    overrideMarkSpec(name: string, factory: (previous: MarkSpec) => MarkSpec): this {
        const current = this.#marks.get(name);
        if (current === undefined) {
            throw new Error(`Cannot override mark spec "${name}": it is not registered`);
        }
        this.#marks.set(name, {...current, spec: factory(current.spec)});
        return this;
    }

    overrideMarkdownTokenParserSpec(name: string, factory: (previous: unknown) => unknown): this {
        const current = this.#parserTokens.get(name);
        if (current === undefined) {
            throw new Error(`Cannot override Markdown parser token "${name}": it is not registered`);
        }
        this.#parserTokens.set(name, factory(current));
        return this;
    }

    overrideNodeSerializerSpec(name: string, factory: (previous: unknown) => unknown): this {
        const current = this.#serializerNodes.get(name);
        if (current === undefined) {
            throw new Error(`Cannot override node serializer "${name}": it is not registered`);
        }
        this.#serializerNodes.set(name, factory(current));
        return this;
    }

    overrideMarkSerializerSpec(name: string, factory: (previous: unknown) => unknown): this {
        const current = this.#serializerMarks.get(name);
        if (current === undefined) {
            throw new Error(`Cannot override mark serializer "${name}": it is not registered`);
        }
        this.#serializerMarks.set(name, factory(current));
        return this;
    }

    hasNodeSpec(name: string): boolean {
        return this.#nodes.has(name);
    }

    hasMarkSpec(name: string): boolean {
        return this.#marks.has(name);
    }

    build(): ExtensionSpec {
        const nodes = new Map(this.#nodes);
        const parserTokens = new Map(this.#parserTokens);
        const serializerMarks = new Map(this.#serializerMarks);
        const serializerNodes = new Map(this.#serializerNodes);
        const marks = new Map(
            [...this.#marks].sort(
                ([left], [right]) => (this.#markPriorities.get(right) ?? 0) - (this.#markPriorities.get(left) ?? 0),
            ),
        );
        const markdownConfigs = [...this.#markdownConfigs];
        const plugins = [...this.#plugins];
        const keymaps = [...this.#keymaps];
        const rules = [...this.#inputRules];
        const actions = [...this.#actions];

        return {
            configureMd(markdown, parserType) {
                return markdownConfigs.reduce(
                    (configured, entry) => entry[parserType] ? entry.callback(configured) : configured,
                    markdown,
                );
            },
            marks: () => new Map(marks),
            nodes: () => new Map(nodes),
            parserTokens: () => new Map(parserTokens),
            serializerMarks: () => new Map(serializerMarks),
            serializerNodes: () => new Map(serializerNodes),
            plugins(deps) {
                const result: Plugin[] = [];
                let anonymousPluginIndex = 0;
                for (const entry of [...plugins, ...keymaps.map((factory) => ({
                    factory: (currentDeps: ExtensionDeps) => keymap(factory.factory(currentDeps)),
                    priority: factory.priority,
                })), ...rules.map((factory) => ({
                    factory: (currentDeps: ExtensionDeps) => inputRules(factory.factory(currentDeps)),
                    priority: factory.priority,
                }))].sort((left, right) => right.priority - left.priority)) {
                    const created = entry.factory(deps);
                    for (const plugin of Array.isArray(created) ? created : [created]) {
                        const mutablePlugin = plugin as Plugin & {key: string};
                        if (mutablePlugin.key.startsWith('plugin$') && mutablePlugin.props.decorations === undefined) {
                            mutablePlugin.key = `extension-plugin-${anonymousPluginIndex++}`;
                        }
                        result.push(mutablePlugin);
                    }
                }
                return result;
            },
            actions(deps) {
                return Object.fromEntries(actions.map(([name, factory]) => [name, factory(deps)]));
            },
        };
    }

    private assertUnique<T>(registry: ReadonlyMap<string, T>, name: string, kind: string): void {
        if (registry.has(name)) throw new Error(`ProseMirror ${kind} with name "${name}" already exists`);
    }

    private assertSerializerUnique<T>(registry: ReadonlyMap<string, T>, name: string, kind: string): void {
        if (registry.has(name)) throw new Error(`Markdown ${kind} serializer with name "${name}" is already registered`);
    }
}
