import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import { Mark } from 'prosemirror-model';
import type { MarkType, Node, NodeType, Schema } from 'prosemirror-model';

export type TokenAttrs = Record<string, unknown>;
export interface LinkMatch {
  index: number;
  lastIndex: number;
  raw: string;
  schema: string;
  text: string;
  url: string;
}
export type ParserToken = {
  attrs?: TokenAttrs | ((token: Token) => TokenAttrs);
  getAttrs?: (token: Token, tokens: Token[], index: number) => TokenAttrs;
  ignore?: boolean;
  name: string;
  noCloseToken?: boolean;
  type: 'block' | 'mark' | 'node';
};
export type ParserTransform = (node: Node) => Node;
export type ProcessToken = (token: Token, index: number, rawMarkup: string | null) => Token;
export type ProcessNodeAttrs = (token: Token, attrs: TokenAttrs) => TokenAttrs;
export type ProcessNode = (node: Node) => Node;

export interface MarkdownParserDynamicModifierConfig {
  [elementType: string]: {
    processNode?: ProcessNode[];
    processNodeAttrs?: ProcessNodeAttrs[];
    processToken?: ProcessToken[];
  };
}

export class MarkdownParserDynamicModifier {
  readonly #processors: Map<string, MarkdownParserDynamicModifierConfig[string]>;

  constructor(config: MarkdownParserDynamicModifierConfig) {
    this.#processors = new Map(Object.entries(config));
  }

  processAttrs(token: Token, attrs: TokenAttrs): TokenAttrs {
    return (
      this.#processors
        .get(tokenName(token.type))
        ?.processNodeAttrs?.reduce((current, process) => process(token, current), attrs) ?? attrs
    );
  }

  processNode(node: Node): Node {
    return (
      this.#processors.get(node.type.name)?.processNode?.reduce((current, process) => process(current), node) ?? node
    );
  }

  processTokens(tokens: Token[], rawMarkup: string | null): Token[] {
    return tokens.map((token, index) => {
      const processed =
        this.#processors
          .get(tokenName(token.type))
          ?.processToken?.reduce((current, process) => process(current, index, rawMarkup), token) ?? token;
      if (processed.children !== null) processed.children = this.processTokens(processed.children ?? [], rawMarkup);
      return processed;
    });
  }
}

/** Framework-independent port of the upstream stack-based markdown-it parser. */
export class MarkdownParser {
  readonly #dynamicModifier?: MarkdownParserDynamicModifier;
  readonly #schema: Schema;
  readonly #tokenizer: MarkdownIt;
  readonly #tokens: Record<string, ParserToken>;
  readonly #transforms: readonly ParserTransform[];
  #marks = Mark.none;
  #stack: Array<{ attrs?: TokenAttrs; content: Node[]; type: NodeType }> = [];

  constructor(
    schema: Schema,
    tokenizer: MarkdownIt,
    tokens: Record<string, ParserToken>,
    options: {
      dynamicModifier?: MarkdownParserDynamicModifier;
      transforms?: readonly ParserTransform[];
    } = {},
  ) {
    this.#schema = schema;
    this.#tokenizer = tokenizer;
    this.#tokens = tokens;
    this.#dynamicModifier = options.dynamicModifier;
    this.#transforms = options.transforms ?? [];
  }

  isPunctChar(character: string): boolean {
    return this.#tokenizer.utils.isPunctChar(character);
  }
  matchLinks(text: string): LinkMatch[] | null {
    return this.#tokenizer.linkify.match(text);
  }
  normalizeLink(url: string): string {
    return this.#tokenizer.normalizeLink(url);
  }
  normalizeLinkText(url: string): string {
    return this.#tokenizer.normalizeLinkText(url);
  }
  validateLink(url: string): boolean {
    return this.#tokenizer.validateLink(url);
  }

  parse(source: string | Token[]): Node {
    this.#marks = Mark.none;
    this.#stack = [{ content: [], type: this.#schema.topNodeType }];
    const tokens =
      this.#dynamicModifier?.processTokens(
        typeof source === 'string' ? this.#tokenizer.parse(source, {}) : source,
        typeof source === 'string' ? source : null,
      ) ?? (typeof source === 'string' ? this.#tokenizer.parse(source, {}) : source);
    this.parseTokens(tokens);
    let document: Node | null = null;
    while (this.#stack.length > 0) document = this.closeNode();
    return this.#transforms.reduce(
      (current, transform) => transform(current),
      document ?? this.#schema.topNodeType.createAndFill()!,
    );
  }

  private addNode(type: NodeType, attrs?: TokenAttrs, content?: Node[]): Node | null {
    const node = type.createAndFill(attrs, content, this.#marks);
    if (node !== null) this.top().content.push(this.#dynamicModifier?.processNode(node) ?? node);
    return node;
  }

  private addText(text: string): void {
    if (text.length === 0) return;
    const nodes = this.top().content;
    const node = this.#schema.text(text, this.#marks);
    const last = nodes.at(-1);
    if (last?.isText && Mark.sameSet(last.marks, node.marks))
      nodes[nodes.length - 1] = this.#schema.text(`${last.text ?? ''}${text}`, last.marks);
    else nodes.push(node);
  }

  private closeNode(): Node | null {
    this.#marks = Mark.none;
    const node = this.#stack.pop();
    if (node === undefined) return null;
    if (this.#stack.length === 0) {
      const document = node.type.createAndFill(node.attrs, node.content) ?? node.type.create(node.attrs, node.content);
      return this.#dynamicModifier?.processNode(document) ?? document;
    }
    return this.addNode(node.type, node.attrs, node.content);
  }

  private parseTokens(tokens: Token[]): void {
    for (const [index, token] of tokens.entries()) {
      if (token.type === 'text') {
        this.addText(trimToken(token.content));
        continue;
      }
      if (token.type === 'inline') {
        this.parseTokens(token.children ?? []);
        continue;
      }
      if (token.type === 'softbreak' && this.#tokens.softbreak === undefined) {
        this.addText('\n');
        continue;
      }
      const spec = this.#tokens[(token.meta?.['pm-node'] as string) ?? tokenName(token.type)];
      if (spec === undefined) throw new RangeError(`No token spec for token: ${token.type}`);
      if (spec.ignore) continue;
      const initialAttrs =
        spec.getAttrs?.(token, tokens, index) ?? (typeof spec.attrs === 'function' ? spec.attrs(token) : spec.attrs);
      const attrs = this.#dynamicModifier?.processAttrs(token, initialAttrs ?? {}) ?? initialAttrs;
      const nodeType = this.#schema.nodes[spec.name];
      const markType = this.#schema.marks[spec.name];
      if (spec.type === 'mark' && markType !== undefined) this.handleMark(token, markType, attrs, spec.noCloseToken);
      if (spec.type === 'node' && nodeType !== undefined) this.addNode(nodeType, attrs);
      if (spec.type === 'block' && nodeType !== undefined) this.handleBlock(token, nodeType, attrs, spec.noCloseToken);
    }
  }

  private handleBlock(
    token: Token,
    type: NodeType,
    attrs: TokenAttrs | undefined,
    noCloseToken: boolean | undefined,
  ): void {
    if (noCloseToken) {
      this.#stack.push({ attrs, content: [], type });
      this.addText(trimToken(token.content));
      this.closeNode();
      return;
    }
    if (token.type.endsWith('_open')) this.#stack.push({ attrs, content: [], type });
    if (token.type.endsWith('_close')) this.closeNode();
  }

  private handleMark(
    token: Token,
    type: MarkType,
    attrs: TokenAttrs | undefined,
    noCloseToken: boolean | undefined,
  ): void {
    const mark = type.create(attrs);
    if (noCloseToken) {
      this.#marks = mark.addToSet(this.#marks);
      this.addText(trimToken(token.content));
      this.#marks = type.removeFromSet(this.#marks);
      return;
    }
    if (token.type.endsWith('_open')) this.#marks = mark.addToSet(this.#marks);
    if (token.type.endsWith('_close')) this.#marks = type.removeFromSet(this.#marks);
  }

  private top() {
    return this.#stack[this.#stack.length - 1]!;
  }
}

function tokenName(name: string): string {
  return name.replace(/(_open|_close)$/, '');
}
function trimToken(value: string): string {
  return value.endsWith('\n') || value.endsWith('\\n') ? value.slice(0, -1) : value;
}
