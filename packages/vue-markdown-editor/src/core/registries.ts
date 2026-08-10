import {Schema} from 'prosemirror-model';
import type {MarkSpec, NodeSpec} from 'prosemirror-model';
import {MarkdownParser, MarkdownSerializer} from 'prosemirror-markdown';
import type {ParseSpec} from 'prosemirror-markdown';
import type MarkdownIt from 'markdown-it';
import type {Schema as ProseMirrorSchema} from 'prosemirror-model';

export interface SchemaSpecModifier {
    processNodeSpec(name: string, spec: NodeSpec): NodeSpec;
}

/** Collects extension schema definitions before ProseMirror creates the immutable schema. */
export class SchemaSpecRegistry {
    readonly #marks: Record<string, MarkSpec> = {};
    readonly #nodes: Record<string, NodeSpec> = {};

    constructor(
        private readonly topNode?: string,
        private readonly dynamicModifier?: SchemaSpecModifier,
    ) {}

    addMark(name: string, spec: MarkSpec): this {
        this.#marks[name] = spec;
        return this;
    }

    addNode(name: string, spec: NodeSpec): this {
        this.#nodes[name] = this.dynamicModifier?.processNodeSpec(name, spec) ?? spec;
        return this;
    }

    createSchema(): Schema {
        return new Schema({
            topNode: this.topNode,
            nodes: this.#nodes,
            marks: this.#marks,
        });
    }
}

/** Maintains Markdown parser tokens until task 3 wires them to the parser implementation. */
export class ParserTokenRegistry<Token> {
    readonly #tokens = new Map<string, Token>();

    add(name: string, token: Token): this {
        this.#tokens.set(name, token);
        return this;
    }

    get(name: string): Token | undefined {
        return this.#tokens.get(name);
    }

    entries(): ReadonlyMap<string, Token> {
        return new Map(this.#tokens);
    }
}

/**
 * Runtime parser-token registry adapted from upstream `ParserTokensRegistry`.
 * It deliberately delegates parsing to the package's current ProseMirror
 * Markdown implementation until the upstream custom parser lands.
 */
export class ParserTokensRegistry {
    readonly #tokens: Record<string, ParseSpec> = {};

    addToken(name: string, token: ParseSpec): this {
        this.#tokens[name] = token;
        return this;
    }

    createParser(schema: ProseMirrorSchema, tokenizer: MarkdownIt): MarkdownParser {
        return new MarkdownParser(schema, tokenizer, this.#tokens);
    }

    tokens(): Readonly<Record<string, ParseSpec>> {
        return {...this.#tokens};
    }
}

/** Maintains Markdown serializer tokens until task 3 wires them to the serializer implementation. */
export class SerializerTokenRegistry<NodeToken, MarkToken> {
    readonly #marks = new Map<string, MarkToken>();
    readonly #nodes = new Map<string, NodeToken>();

    addMark(name: string, token: MarkToken): this {
        this.#marks.set(name, token);
        return this;
    }

    addNode(name: string, token: NodeToken): this {
        this.#nodes.set(name, token);
        return this;
    }

    marks(): ReadonlyMap<string, MarkToken> {
        return new Map(this.#marks);
    }

    nodes(): ReadonlyMap<string, NodeToken> {
        return new Map(this.#nodes);
    }
}

/** Runtime serializer-token registry adapted from upstream `SerializerTokensRegistry`. */
export class SerializerTokensRegistry {
    readonly #marks: Record<string, Parameters<typeof MarkdownSerializer>[1][string]> = {};
    readonly #nodes: Record<string, Parameters<typeof MarkdownSerializer>[0][string]> = {};

    addMark(name: string, token: Parameters<typeof MarkdownSerializer>[1][string]): this {
        this.#marks[name] = token;
        return this;
    }

    addNode(name: string, token: Parameters<typeof MarkdownSerializer>[0][string]): this {
        this.#nodes[name] = token;
        return this;
    }

    createSerializer(): MarkdownSerializer {
        const serializer = new MarkdownSerializer(this.#nodes, this.#marks);
        const serialize = serializer.serialize.bind(serializer);
        serializer.serialize = (content, options) => {
            const markdown = serialize(content, options);
            return markdown.length === 0 || markdown.endsWith('\n') ? markdown : `${markdown}\n`;
        };
        return serializer;
    }
}
