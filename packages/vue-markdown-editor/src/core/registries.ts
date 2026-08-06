import {Schema} from 'prosemirror-model';
import type {MarkSpec, NodeSpec} from 'prosemirror-model';

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
