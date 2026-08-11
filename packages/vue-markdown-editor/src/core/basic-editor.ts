import {
  chainCommands,
  setBlockType,
  toggleMark,
} from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import katex from "katex";
import MarkdownIt from "markdown-it";
import deflist from "markdown-it-deflist";
import markPlugin from "markdown-it-mark";
import subPlugin from "markdown-it-sub";
import insPlugin from "markdown-it-ins";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { Schema } from "prosemirror-model";
import type {
  MarkSpec,
  Node as ProseMirrorNode,
  NodeSpec,
} from "prosemirror-model";
import type { ParseSpec } from "prosemirror-markdown";
import { EditorState, NodeSelection, Plugin, PluginKey, TextSelection } from "prosemirror-state";
import type {Transaction} from "prosemirror-state";
import type { Command, StateField } from "prosemirror-state";
import {
  liftListItem,
  splitListItem,
} from "prosemirror-schema-list";
import {
  addColumnAfter,
  addRowAfter,
  CellSelection,
  deleteColumn,
  deleteRow,
  findCellPos,
  findTable,
  tableEditing,
  TableMap,
} from "prosemirror-tables";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

import "prosemirror-view/style/prosemirror.css";
import "katex/dist/katex.min.css";

import { defaultMarkdownSchema, MarkdownCodec } from "./markdown";
import { WysiwygContentHandler } from "./content-handler";
import {
  joinPrevList,
  liftEmptyListItem,
  sinkOnlySelectedListItem,
  toList,
} from "./lists";
import { ExtensionsManager } from "./extensions-manager";
import type { ExtensionBuilder } from "./extension-builder";
import { mountBasicMarkupEditor } from "./markup-editor";
import { getAdvancedMarkdownRenderers } from "./optional-renderers";
import { DefaultPreset } from "../presets/default";
import { createHistoryActions } from "../extensions/behavior/history";
import type { SelectionContextOptions } from "../extensions/behavior/selection-context";
import {
  blockquoteNodeSpec,
  blockquoteTokenSpec,
  serializeBlockquote,
  toggleQuote,
} from "../extensions/markdown/blockquote";
import {
  boldMarkSpec,
  boldTokenSpec,
  serializeBold,
  toggleBold,
} from "../extensions/markdown/bold";
import {
  italicMarkSpec,
  italicTokenSpec,
  serializeItalic,
  toggleItalic,
} from "../extensions/markdown/italic";
import {
  codeMarkSpec,
  codeTokenSpec,
  serializeCode,
  toggleCode,
} from "../extensions/markdown/code";
import {
  codeBlockNodeSpec,
  codeBlockTokenSpecs,
  serializeCodeBlock,
  setCodeBlock,
} from "../extensions/markdown/code-block";
import { toHeading } from "../extensions/markdown/heading";
import {
  addHorizontalRule,
  horizontalRuleNodeSpec,
  horizontalRuleTokenSpec,
  serializeHorizontalRule,
} from "../extensions/markdown/horizontal-rule";
import {
  linkMarkSpec,
  linkTokenSpec,
  serializeLink,
  toggleLink,
} from "../extensions/markdown/link";
import {
  breakTokenSpecs,
  hardBreakNodeSpec,
  serializeHardBreak,
  serializeSoftBreak,
  softBreakNodeSpec,
} from "../extensions/markdown/breaks";
import {
  deflistNodeSpecs,
  deflistSerializerNodes,
  deflistTokenSpecs,
} from "../extensions/markdown/deflist";
import {
  htmlNodeSpecs,
  htmlSerializerNodes,
  htmlTokenSpecs,
} from "../extensions/markdown/html";
import {
  imageNodeSpec,
  imageTokenSpec,
  serializeImage,
} from "../extensions/markdown/image";
import { markTokenSpec } from "../extensions/markdown/mark";
import {serializeStrike, strikeMarkSpec, strikeTokenSpec} from "../extensions/markdown/strike";
import {serializeSubscript, subscriptMarkSpec, subscriptTokenSpec} from "../extensions/markdown/subscript";
import {serializeUnderline, underlineMarkSpec, underlineTokenSpec} from "../extensions/markdown/underline";
import {
  listNodeSpecs,
  listSerializerNodes,
  listTokenSpecs,
} from "../extensions/markdown/list-specs";
import {
  addTableColumn,
  addTableRow,
  deleteTable,
  deleteTableColumn,
  deleteTableRow,
  insertTable,
  setTableColumnAlignment,
  TableCellAlign,
  TableNode,
  tableNodeSpecs,
  tableSerializerNodes,
} from "../extensions/markdown/table";
import {toggleFoldingHeading} from '../extensions/additional/folding-heading';
import {configureMathMarkdown, createMathNodeSpecs, defaultMathLatex, mathSerializerNodes, mathTokenSpecs} from '../extensions/additional/math';
import {configureMermaidMarkdown, createMermaidNodeSpec, mermaidTokenSpec, serializeMermaid} from '../extensions/additional/mermaid';
import {configureQuoteLinkMarkdown, quoteLinkNodeSpec, quoteLinkTokenSpec, serializeQuoteLink} from '../extensions/additional/quote-link';

const basicMarks: Record<string, MarkSpec> = {
  ins: underlineMarkSpec,
  sub: subscriptMarkSpec,
  strike: strikeMarkSpec,
  color: {
    attrs: { color: {} },
    parseDOM: [{ style: "color", getAttrs: (color) => ({ color }) }],
    toDOM: (mark) => ["span", { style: `color: ${mark.attrs.color}` }, 0],
  },
  mark: {
    parseDOM: [{ tag: "mark" }, { tag: "span[data-mark]" }],
    toDOM: () => ["mark", 0],
  },
  strikethrough: {
    parseDOM: [
      { tag: "s" },
      { tag: "del" },
      { style: "text-decoration=line-through" },
    ],
    toDOM: () => ["s", 0],
  },
  underline: {
    parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
    toDOM: () => ["u", 0],
  },
};

const markdownTableNodes: Record<string, NodeSpec> = tableNodeSpecs;

function renderHtmlBlock(html: string, attribute: string): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute(attribute, "");
  element.innerHTML = html;
  return element;
}

function renderOptionalBlock(
  kind: "math" | "mermaid",
  source: string,
  display = true,
): HTMLElement {
  const renderers = getAdvancedMarkdownRenderers();
  if (kind === "math" && renderers.math !== undefined)
    return renderers.math(source, display);
  if (kind === "mermaid" && renderers.mermaid !== undefined)
    return renderers.mermaid(source);
  const element = document.createElement(
    kind === "math" && !display ? "span" : "pre",
  );
  element.setAttribute(
    `data-${kind}${kind === "math" ? (display ? "-block" : "-inline") : ""}`,
    "",
  );
  if (kind === "math") {
    element.setAttribute("aria-label", "Formula. Double-click to edit.");
    try {
      element.innerHTML = katex.renderToString(source, {
        displayMode: display,
        throwOnError: true,
      });
    } catch (error) {
      element.setAttribute("data-math-error", "");
      const fallback = document.createElement(display ? "pre" : "span");
      fallback.className = "markdown-editor__math-error";
      fallback.textContent = source;
      element.replaceChildren(fallback);
    }
    const hint = document.createElement("span");
    hint.className = "markdown-editor__math-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.textContent = "Double-click to edit";
    element.append(hint);
  } else {
    element.textContent = source;
  }
  return element;
}

function renderYfmHtml(source: string): HTMLElement {
  const renderer = getAdvancedMarkdownRenderers().html;
  if (renderer !== undefined) return renderer(source);
  const element = document.createElement("pre");
  element.setAttribute("data-yfm-html", "");
  element.textContent = source;
  return element;
}

const extendedMarkdownNodes: Record<string, NodeSpec> = {
  ...createMathNodeSpecs((latex, display) => renderOptionalBlock("math", latex, display)),
  mermaid: createMermaidNodeSpec((source) => renderOptionalBlock("mermaid", source)),
  definition_description: {
    content: "block+",
    group: "block",
    toDOM: () => ["dd", 0],
  },
  definition_list: {
    content: "definition_term definition_description+",
    group: "block",
    toDOM: () => ["dl", 0],
  },
  definition_term: { content: "inline*", toDOM: () => ["dt", 0] },
  quote_link: quoteLinkNodeSpec,
  directive: {
    atom: true,
    attrs: { content: { default: "" }, name: { default: "note" } },
    group: "block",
    toDOM: (node) =>
      node.attrs.name === "html"
        ? renderHtmlBlock(node.attrs.content, "data-directive-html")
        : ["div", { "data-directive": node.attrs.name }, node.attrs.content],
  },
  raw_html: {
    atom: true,
    attrs: { html: { default: "" } },
    group: "block",
    toDOM: (node) => renderHtmlBlock(node.attrs.html, "data-raw-html"),
  },
  yfm_html_block: {
    atom: true,
    attrs: { html: { default: "" } },
    group: "block",
    toDOM: (node) => renderYfmHtml(node.attrs.html),
  },
};

/** Schema for the first WYSIWYG milestone. YFM-specific nodes are added later. */
export const basicMarkdownSchema: Schema = new Schema({
  marks: defaultMarkdownSchema.spec.marks
    .update("code", codeMarkSpec)
    .update("em", italicMarkSpec)
    .update("link", linkMarkSpec)
    .update("strong", boldMarkSpec)
    .append(basicMarks),
  nodes: defaultMarkdownSchema.spec.nodes
    .update("blockquote", blockquoteNodeSpec)
    .update("code_block", codeBlockNodeSpec)
    .update("horizontal_rule", horizontalRuleNodeSpec)
    .update("image", imageNodeSpec)
    .update("hard_break", hardBreakNodeSpec)
    .update("list_item", listNodeSpecs.list_item)
    .update("bullet_list", listNodeSpecs.bullet_list)
    .update("ordered_list", listNodeSpecs.ordered_list)
    .update("heading", {
      attrs: {
        class: { default: null },
        folding: { default: null },
        id: { default: null },
        level: { default: 1 },
      },
      content: "inline*",
      group: "block",
      defining: true,
      toDOM: (node) => [
        `h${node.attrs.level}`,
        { class: node.attrs.class, id: node.attrs.id },
        0,
      ],
    })
    .append({
      soft_break: softBreakNodeSpec,
      ...deflistNodeSpecs,
      ...htmlNodeSpecs,
      ...markdownTableNodes,
      ...extendedMarkdownNodes,
    }),
});

const tableTokenSpecs: Record<string, ParseSpec> = {
  blockquote: blockquoteTokenSpec,
  code_inline: codeTokenSpec,
  ...codeBlockTokenSpecs,
  em: italicTokenSpec,
  hr: horizontalRuleTokenSpec,
  link: linkTokenSpec,
  image: imageTokenSpec,
  mark: markTokenSpec,
  s: strikeTokenSpec,
  sub: subscriptTokenSpec,
  ins: underlineTokenSpec,
  ...breakTokenSpecs,
  strong: boldTokenSpec,
  ...listTokenSpecs,
  ...deflistTokenSpecs,
  ...htmlTokenSpecs,
  directive: {
    node: "directive",
    getAttrs: (token) => ({ content: token.content, name: token.info }),
  },
  heading: {
    block: "heading",
    getAttrs: (token) => ({
      class: token.attrGet("class"),
      folding:
        token.attrGet("folding") === null
          ? null
          : token.attrGet("folding") === "true",
      id: token.attrGet("id"),
      level: Number(token.tag.slice(1)),
    }),
  },
  ...mathTokenSpecs,
  quote_link: quoteLinkTokenSpec,
  table: { block: "table" },
  tbody: { block: TableNode.Body },
  td: { block: TableNode.DataCell },
  th: { block: TableNode.HeaderCell },
  thead: { block: TableNode.Head },
  tr: { block: TableNode.Row },
  yfm_html_block: {
    node: "yfm_html_block",
    getAttrs: (token) => ({ html: token.content }),
  },
};

function createExtendedMarkdownIt(markdown = new MarkdownIt("commonmark", { html: true })): MarkdownIt {
  markdown
    .enable("table")
    .use(deflist)
    .use(markPlugin)
    .enable("strikethrough")
    .use(subPlugin)
    .use(insPlugin);
  configureMathMarkdown(markdown);
  configureMermaidMarkdown(markdown);
  configureQuoteLinkMarkdown(markdown);
  markdown.core.ruler.after("block", "folding_heading", (state) => {
    for (const [index, token] of state.tokens.entries()) {
      const inline = state.tokens[index + 1];
      const close = state.tokens[index + 2];
      if (
        token?.type !== "paragraph_open" ||
        inline?.type !== "inline" ||
        close?.type !== "paragraph_close"
      )
        continue;
      const match = inline.content.match(/^(#{1,6})\+\s+(.+)$/);
      if (match === null) continue;
      const level = match[1]?.length ?? 1;
      token.type = "heading_open";
      token.tag = `h${level}`;
      token.attrSet("folding", "false");
      inline.content = match[2] ?? "";
      close.type = "heading_close";
      close.tag = `h${level}`;
    }
  });
  markdown.core.ruler.after("folding_heading", "heading_attributes", (state) => {
    for (const [index, token] of state.tokens.entries()) {
      const inline = state.tokens[index + 1];
      if (token?.type !== "heading_open" || inline?.type !== "inline") continue;
      if (inline.content.startsWith("+ ")) {
        inline.content = inline.content.slice(2);
        token.attrSet("folding", "false");
      }
      const match = inline.content.match(/\s+\{([^}]+)\}$/);
      if (match === null) continue;
      inline.content = inline.content.slice(0, match.index);
      for (const attribute of match[1]?.split(/\s+/) ?? []) {
        if (attribute.startsWith("#")) token.attrSet("id", attribute.slice(1));
        if (attribute.startsWith("."))
          token.attrSet("class", attribute.slice(1));
      }
    }
  });
  markdown.block.ruler.before(
    "fence",
    "directive",
    (state, startLine, endLine, silent) => {
      const start = state.getLines(startLine, startLine + 1, 0, false).trim();
      const yfmHtml = start === ":::html";
      const match = start.match(/^:::\s*(\w+)\s*$/);
      if (match === null) return false;
      let line = startLine + 1;
      while (
        line < endLine &&
        state.getLines(line, line + 1, 0, false).trim() !== ":::"
      )
        line += 1;
      if (line === endLine) return false;
      if (!silent) {
        const token = state.push(
          yfmHtml ? "yfm_html_block" : "directive",
          "",
          0,
        );
        token.content = state.getLines(startLine + 1, line, 0, false).trim();
        token.info = match[1] ?? "note";
      }
      state.line = line + 1;
      return true;
    },
  );
  return markdown;
}

const basicMarkdownParserExtension = (builder: ExtensionBuilder) => {
  builder.configureMd(createExtendedMarkdownIt);
  for (const [name, token] of Object.entries(tableTokenSpecs)) {
    builder.addParserToken(name, token);
  }
  builder.addParserToken('mermaid', mermaidTokenSpec);
};

const basicMarkdownParser = ExtensionsManager.process(
  basicMarkdownParserExtension,
  {
    baseSchema: basicMarkdownSchema,
    markdown: { html: true },
  },
).textParser;

function createBasicDefaultPresetPlugins(
  placeholder: string,
  onFiles: MountBasicWysiwygEditorOptions["onFiles"],
  selectionContext: MountBasicWysiwygEditorOptions["selectionContext"],
): Plugin[] {
  return ExtensionsManager.plugins(
    (builder) => builder.use(DefaultPreset, {
      bold: { boldKey: "Mod-b" },
      filePaste: { onFiles },
      italic: { italicKey: "Mod-i" },
      placeholder: { content: placeholder },
      selectionContext,
    }),
    basicMarkdownSchema,
  );
}

export function createMarkdownTablePastePlugin(): Plugin {
  return new Plugin({
    props: {
      handleDOMEvents: {
        paste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain') ?? '';
          const trimmed = text.trim();
          if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
          const document = basicMarkdownCodec.parse(text);
          const table = document.childCount === 1 && document.firstChild?.type.name === TableNode.Table
            ? document.firstChild
            : undefined;
          if (table === undefined) return false;
          event.preventDefault();
          view.dispatch(view.state.tr.replaceSelectionWith(table).scrollIntoView());
          return true;
        },
      },
    },
  });
}

const basicMarkdownSerializerNodes = {
  blockquote: serializeBlockquote,
  code_block: serializeCodeBlock,
  hard_break: serializeHardBreak,
  horizontal_rule: serializeHorizontalRule,
  image: serializeImage,
  ...listSerializerNodes,
  definition_description(state, node) {
    state.renderContent(node);
    state.closeBlock(node);
  },
  definition_list(state, node) {
    state.renderContent(node);
    state.closeBlock(node);
  },
  definition_term(state, node) {
    state.renderInline(node);
    state.write("\n: ");
  },
  directive(state, node) {
    state.write(`::: ${node.attrs.name}\n${node.attrs.content}\n:::`);
    state.closeBlock(node);
  },
  ...mathSerializerNodes,
  mermaid: serializeMermaid,
  heading(state, node) {
    state.write(
      `${"#".repeat(node.attrs.level)}${node.attrs.folding === null ? "" : "+"} `,
    );
    state.renderInline(node);
    const attributes = [
      node.attrs.id === null ? "" : `#${node.attrs.id}`,
      node.attrs.class === null ? "" : `.${node.attrs.class}`,
    ]
      .filter(Boolean)
      .join(" ");
    if (attributes) state.write(` {${attributes}}`);
    state.closeBlock(node);
  },
  raw_html(state, node) {
    state.write(node.attrs.html);
    state.closeBlock(node);
  },
  soft_break: serializeSoftBreak,
  ...deflistSerializerNodes,
  ...htmlSerializerNodes,
  yfm_html_block(state, node) {
    state.write(`:::html\n${node.attrs.html}\n:::`);
    state.closeBlock(node);
  },
  quote_link: serializeQuoteLink,
  ...tableSerializerNodes,
};

const basicMarkdownSerializerMarks = {
  ins: serializeUnderline,
  sub: serializeSubscript,
  strike: serializeStrike,
  code: serializeCode,
  em: serializeItalic,
  link: serializeLink,
  strong: serializeBold,
  color: {
    close: "</span>",
    open: (_state, mark) => `<span style="color: ${mark.attrs.color}">`,
  },
  mark: { close: "==", open: "==" },
  strikethrough: { close: "~~", open: "~~" },
  underline: { close: "</u>", open: "<u>" },
};

const basicMarkdownSerializer = ExtensionsManager.process(
  (builder) => {
    basicMarkdownParserExtension(builder);
    for (const [name, token] of Object.entries(basicMarkdownSerializerNodes)) {
      builder.addNodeSerializer(name, token);
    }
    for (const [name, token] of Object.entries(basicMarkdownSerializerMarks)) {
      builder.addMarkSerializer(name, token);
    }
  },
  { baseSchema: basicMarkdownSchema, markdown: { html: true } },
).serializer;

export const basicMarkdownCodec = new MarkdownCodec({
  parser: basicMarkdownParser,
  serializer: basicMarkdownSerializer,
});

function getNodeType(name: string) {
  const nodeType = basicMarkdownSchema.nodes[name];
  if (nodeType === undefined) {
    throw new Error(`Missing basic editor node type: ${name}`);
  }
  return nodeType;
}

function getMarkType(name: string) {
  const markType = basicMarkdownSchema.marks[name];
  if (markType === undefined) {
    throw new Error(`Missing basic editor mark type: ${name}`);
  }
  return markType;
}

function createTableCommand(rows = 3, columns = 3): Command {
  return insertTable(rows, columns);
}

function insertFileCommand(href: string, name: string): Command {
  return (state, dispatch) => {
    if (dispatch !== undefined) {
      const link = getMarkType("link").create({ href });
      dispatch(
        state.tr
          .replaceSelectionWith(state.schema.text(name, [link]), false)
          .scrollIntoView(),
      );
    }
    return true;
  };
}

function insertImageCommand(src: string, alt: string): Command {
  return (state, dispatch) => {
    if (dispatch !== undefined) {
      const image = getNodeType("image").create({ alt, src, title: null });
      dispatch(state.tr.replaceSelectionWith(image).scrollIntoView());
    }
    return true;
  };
}

function setColorCommand(color: string): Command {
  return (state, dispatch) => {
    const mark = getMarkType("color");
    if (dispatch !== undefined) {
      const { empty, from, to } = state.selection;
      const transaction = empty
        ? state.tr.removeStoredMark(mark).addStoredMark(mark.create({ color }))
        : state.tr
            .removeMark(from, to, mark)
            .addMark(from, to, mark.create({ color }));
      dispatch(transaction.scrollIntoView());
    }
    return true;
  };
}

export interface BasicEditorCommands {
  addMathInline: Command;
  addTableColumn: Command;
  addTableRow: Command;
  bold: Command;
  bulletList: Command;
  code: Command;
  codeBlock: Command;
  deleteTableColumn: Command;
  deleteTable: Command;
  deleteTableRow: Command;
  heading(level: number): Command;
  horizontalRule: Command;
  insertFile(href: string, name: string): Command;
  insertImage(src: string, alt: string): Command;
  insertMathBlock: Command;
  insertInlineMath: Command;
  insertTable(rows?: number, columns?: number): Command;
  italic: Command;
  liftListItem: Command;
  link(href: string): Command;
  mark: Command;
  orderedList: Command;
  paragraph: Command;
  quote: Command;
  redo: Command;
  setColor(color: string): Command;
  sinkListItem: Command;
  splitListItem: Command;
  strikethrough: Command;
  toMathBlock: Command;
  toggleHeadingFolding: Command;
  underline: Command;
  undo: Command;
}

export interface BasicWysiwygSelectionState {
  bold: boolean;
  bulletList: boolean;
  code: boolean;
  codeBlock: boolean;
  formula: boolean;
  headingLevel: number | undefined;
  headingFolded: boolean;
  italic: boolean;
  mark: boolean;
  orderedList: boolean;
  quote: boolean;
  strikethrough: boolean;
  underline: boolean;
}

const foldingPluginKey = new PluginKey<DecorationSet>("legacy-folding-heading");
const atomicSourcePluginKey = new PluginKey<number | null>("atomic-source-editor");
const tablePopoverPluginKey = new PluginKey<number | null>("table-popover");
const tablePopoverCleanups = new WeakMap<HTMLElement, () => void>();
const TABLE_LONG_PRESS_DELAY = 500;
const atomicSourceNodeNames = new Set([
  "directive",
  "inline_math",
  "math_block",
  "mermaid",
  "raw_html",
  "yfm_html_block",
]);

function getAtomicSource(node: ProseMirrorNode): string {
  switch (node.type.name) {
    case "inline_math":
      return `$${node.attrs.latex}$`;
    case "math_block":
      return `$$\n${node.attrs.latex}\n$$`;
    case "mermaid":
      return `\`\`\`mermaid\n${node.attrs.source}\n\`\`\``;
    case "directive":
      return `::: ${node.attrs.name}\n${node.attrs.content}\n:::`;
    case "yfm_html_block":
      return `:::html\n${node.attrs.html}\n:::`;
    default:
      return node.attrs.html;
  }
}

function getAtomicAttrs(node: ProseMirrorNode, source: string): Record<string, unknown> {
  switch (node.type.name) {
    case "inline_math":
    case "math_block":
      return { ...node.attrs, latex: source.replace(/^\$\$?\s*/, "").replace(/\s*\$\$?$/, "") };
    case "mermaid":
      return { ...node.attrs, source: source.replace(/^```mermaid\s*\n?/, "").replace(/\n?```\s*$/, "") };
    case "directive":
      return { ...node.attrs, content: source.replace(/^:::\s*\w+\s*\n?/, "").replace(/\n?:::\s*$/, "") };
    case "yfm_html_block":
      return { ...node.attrs, html: source.replace(/^:::html\s*\n?/, "").replace(/\n?:::\s*$/, "") };
    default:
      return { ...node.attrs, html: source };
  }
}

function findAtomicSourceNode(doc: ProseMirrorNode, position: number): {node: ProseMirrorNode; position: number} | undefined {
  const directNode = doc.nodeAt(position);
  if (directNode !== null && atomicSourceNodeNames.has(directNode.type.name)) return {node: directNode, position};
  const previousNode = position > 0 ? doc.nodeAt(position - 1) : null;
  if (previousNode !== null && atomicSourceNodeNames.has(previousNode.type.name)) return {node: previousNode, position: position - 1};
  const $position = doc.resolve(position);
  if ($position.nodeAfter !== null && atomicSourceNodeNames.has($position.nodeAfter.type.name)) return {node: $position.nodeAfter, position};
  for (let depth = $position.depth; depth > 0; depth -= 1) {
    const node = $position.node(depth);
    if (atomicSourceNodeNames.has(node.type.name)) return {node, position: $position.before(depth)};
  }
  return undefined;
}

function createAtomicSourceEditorPlugin(): Plugin<number | null> {
  let editorView: EditorView | undefined;
  const close = (): void => {
    if (editorView !== undefined) editorView.dispatch(editorView.state.tr.setMeta(atomicSourcePluginKey, null));
  };
  return new Plugin({
    key: atomicSourcePluginKey,
    state: {
      init: () => null,
      apply: (transaction, value) => {
        const position = transaction.getMeta(atomicSourcePluginKey);
        if (position !== undefined) return position;
        if (value === null || !transaction.docChanged) return value;
        const mapped = transaction.mapping.mapResult(value);
        return mapped.deleted ? null : mapped.pos;
      },
    } as StateField<number | null>,
    view: (view) => {
      editorView = view;
      return {destroy: () => { editorView = undefined; }};
    },
    props: {
      decorations: (state) => {
        const position = atomicSourcePluginKey.getState(state);
        if (position === null || position === undefined) return DecorationSet.empty;
        const found = findAtomicSourceNode(state.doc, position);
        if (found === undefined) return DecorationSet.empty;
        let markupEditor: ReturnType<typeof mountBasicMarkupEditor> | undefined;
        let destroyMarkupEditor: (() => void) | undefined;
        const sourceEditor = Decoration.widget(found.position, () => {
          const dom = document.createElement("div");
          dom.className = "markdown-editor__atomic-source";
          let finished = false;
          let removeOutsidePointerDown: (() => void) | undefined;
          const finish = (commit: boolean): void => {
            if (finished || editorView === undefined) return;
            finished = true;
            removeOutsidePointerDown?.();
            if (commit) {
              const node = editorView.state.doc.nodeAt(found.position);
              const source = markupEditor?.getValue();
              if (node !== null && source !== undefined) editorView.dispatch(editorView.state.tr.setNodeMarkup(found.position, undefined, getAtomicAttrs(node, source)).setMeta(atomicSourcePluginKey, null));
            } else {
              close();
            }
          };
          markupEditor = mountBasicMarkupEditor({initialValue: getAtomicSource(found.node), target: dom});
          const handleOutsidePointerDown = (event: PointerEvent): void => {
            if (
              !(event.target instanceof Node) ||
              dom.contains(event.target) ||
              (event.target instanceof Element &&
                event.target.closest("[data-markdown-editor-toolbar]"))
            )
              return;
            finish(true);
          };
          document.addEventListener("pointerdown", handleOutsidePointerDown, true);
          removeOutsidePointerDown = () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
          destroyMarkupEditor = () => {
            removeOutsidePointerDown?.();
            markupEditor?.destroy();
          };
          dom.addEventListener("keydown", (event) => {
            if (event.key === "Escape") { event.preventDefault(); finish(false); }
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); finish(true); }
          }, true);
          queueMicrotask(() => markupEditor?.focus());
          return dom;
        }, {
          destroy: () => destroyMarkupEditor?.(),
          side: -1,
          stopEvent: () => true,
        });
        return DecorationSet.create(state.doc, [
          Decoration.node(found.position, found.position + found.node.nodeSize, {class: "markdown-editor__atomic-source-original"}),
          sourceEditor,
        ]);
      },
      handleDOMEvents: {
        dblclick: (view, event) => {
          const target = event.target;
          const atomicElement = target instanceof HTMLElement
            ? target.closest<HTMLElement>('[data-math-inline], [data-math-block], [data-mermaid], [data-raw-html], [data-directive-html], [data-yfm-html]')
            : null;
          const position = atomicElement === null
            ? view.posAtCoords({left: event.clientX, top: event.clientY})?.pos
            : view.posAtDOM(atomicElement, 0);
          const selectedNode = position === undefined ? view.state.selection instanceof NodeSelection && atomicSourceNodeNames.has(view.state.selection.node.type.name)
            ? {node: view.state.selection.node, position: view.state.selection.from}
            : undefined : findAtomicSourceNode(view.state.doc, position);
          if (selectedNode === undefined) return false;
          event.preventDefault();
          view.dispatch(view.state.tr.setMeta(atomicSourcePluginKey, selectedNode.position));
          return true;
        },
      },
    },
  });
}

function runTableAction(
  view: EditorView,
  action: string,
  position: number,
): void {
  view.dispatch(
    view.state.tr.setSelection(CellSelection.create(view.state.doc, position)),
  );
  const command =
    action === "add-column"
      ? addColumnAfter
      : action === "add-row"
        ? addRowAfter
        : action === "delete-column"
          ? deleteColumn
          : deleteRow;
  command(view.state, view.dispatch);
}

function createTablePopover(
  position: number,
  tableMap: TableMap,
  onAction: (event: MouseEvent, action: string, position: number) => void,
): HTMLElement {
  const controls = document.createElement("div");
  controls.className = "markdown-editor__table-popover";
  controls.setAttribute("role", "menu");
  controls.setAttribute("aria-label", "Действия с таблицей");
  for (const [action, label, disabled, destructive] of [
    ["add-row", "Добавить строку", false, false],
    ["add-column", "Добавить колонку", false, false],
    ["delete-row", "Удалить строку", tableMap.height === 1, true],
    ["delete-column", "Удалить колонку", tableMap.width === 1, true],
  ] as const) {
    const button = document.createElement("button");
    button.className = destructive
      ? "markdown-editor__table-popover-action markdown-editor__table-popover-action--danger"
      : "markdown-editor__table-popover-action";
    button.dataset.tableAction = action;
    button.dataset.tablePosition = String(position);
    button.disabled = disabled;
    button.textContent = label;
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener("mouseup", (event) =>
      onAction(event, action, position),
    );
    controls.append(button);
  }
  return controls;
}

function mountTablePopover(
  view: EditorView,
  position: number,
  tableMap: TableMap,
): HTMLElement {
  let stopAutoUpdate: (() => void) | undefined;
  const controls = createTablePopover(position, tableMap, (event, action, cellPosition) => {
    event.preventDefault();
    event.stopPropagation();
    runTableAction(view, action, cellPosition);
  });
  document.body.append(controls);
  const reference = view.nodeDOM(position);
  if (reference instanceof HTMLElement) {
    const editor = reference.closest<HTMLElement>(".markdown-editor");
    if (editor !== null) {
      const editorStyles = getComputedStyle(editor);
      for (const name of [
        "--markdown-background",
        "--markdown-border",
        "--markdown-text",
      ]) controls.style.setProperty(name, editorStyles.getPropertyValue(name));
    }
    const update = async (): Promise<void> => {
      const { x, y } = await computePosition(reference, controls, {
        middleware: [offset(6), flip({padding: 8}), shift({padding: 8})],
        placement: "bottom-start",
        strategy: "fixed",
      });
      Object.assign(controls.style, { left: `${x}px`, position: "fixed", top: `${y}px` });
    };
    stopAutoUpdate = autoUpdate(reference, controls, update);
  }
  const placeholder = document.createElement("span");
  tablePopoverCleanups.set(placeholder, () => {
    stopAutoUpdate?.();
    controls.remove();
  });
  return placeholder;
}

function createTableControlsPlugin(): Plugin<number | null> {
  let editorView: EditorView | undefined;
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  const closePopoverOutside = (event: PointerEvent): void => {
    const target = event.target;
    if (
      !(target instanceof Element) ||
      target.closest(".markdown-editor__table-popover") !== null
    )
      return;
    if (
      editorView === undefined ||
      tablePopoverPluginKey.getState(editorView.state) === null
    )
      return;
    editorView.dispatch(
      editorView.state.tr.setMeta(tablePopoverPluginKey, null),
    );
  };
  const clearLongPress = (): void => {
    if (longPressTimer === undefined) return;
    clearTimeout(longPressTimer);
    longPressTimer = undefined;
  };
  const openPopover = (
    view: EditorView,
    clientX: number,
    clientY: number,
  ): boolean => {
    const position = view.posAtCoords({ left: clientX, top: clientY })?.pos;
    if (position === undefined) return false;
    const $cell = findCellPos(view.state.doc, position);
    if ($cell === undefined) return false;
    view.dispatch(
      view.state.tr
        .setSelection(CellSelection.create(view.state.doc, $cell.pos))
        .setMeta(tablePopoverPluginKey, $cell.pos),
    );
    return true;
  };
  return new Plugin({
    key: tablePopoverPluginKey,
    state: {
      init: () => null,
      apply: (transaction, value) => {
        const popoverPosition = transaction.getMeta(tablePopoverPluginKey);
        return popoverPosition === undefined
          ? transaction.docChanged
            ? null
            : value
          : popoverPosition;
      },
    } as StateField<number | null>,
    view: (view) => {
      editorView = view;
      document.addEventListener("pointerdown", closePopoverOutside, true);
      return {
        destroy: () => {
          clearLongPress();
          document.removeEventListener(
            "pointerdown",
            closePopoverOutside,
            true,
          );
          editorView = undefined;
        },
      };
    },
    props: {
      decorations: (state) => {
        const position = tablePopoverPluginKey.getState(state);
        if (position === null || position === undefined)
          return DecorationSet.empty;
        const $cell = findCellPos(state.doc, position);
        if ($cell === undefined) return DecorationSet.empty;
        const table = findTable($cell);
        if (table === null) return DecorationSet.empty;
        const map = TableMap.get(table.node);
        return DecorationSet.create(state.doc, [
          Decoration.widget(
            $cell.pos + 1,
            () => editorView === undefined
              ? document.createElement("span")
              : mountTablePopover(editorView, $cell.pos, map),
            {
              destroy: (dom) => {
                if (dom instanceof HTMLElement)
                  tablePopoverCleanups.get(dom)?.();
              },
              side: -1,
            },
          ),
        ]);
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return false;
          const control = target.closest<HTMLElement>(
            "[data-table-action][data-table-position]",
          );
          if (control !== null) return false;
          const activePopover = tablePopoverPluginKey.getState(view.state);
          if (activePopover !== null && activePopover !== undefined)
            view.dispatch(view.state.tr.setMeta(tablePopoverPluginKey, null));
          return false;
        },
        contextmenu: (view, event) => {
          if (!openPopover(view, event.clientX, event.clientY)) return false;
          event.preventDefault();
          return true;
        },
        touchcancel: () => {
          clearLongPress();
          return false;
        },
        touchend: () => {
          clearLongPress();
          return false;
        },
        touchmove: () => {
          clearLongPress();
          return false;
        },
        touchstart: (view, event) => {
          const touch = event.touches[0];
          if (touch === undefined) return false;
          clearLongPress();
          longPressTimer = setTimeout(() => {
            if (openPopover(view, touch.clientX, touch.clientY))
              event.preventDefault();
            longPressTimer = undefined;
          }, TABLE_LONG_PRESS_DELAY);
          return false;
        },
      },
      handleKeyDown: (view, event) => {
        if (
          event.key !== "Escape" ||
          tablePopoverPluginKey.getState(view.state) === null
        )
          return false;
        view.dispatch(view.state.tr.setMeta(tablePopoverPluginKey, null));
        return true;
      },
    },
  });
}

function createUpstreamTableControlsPlugin(): Plugin {
  let closeMenu: (() => void) | undefined;
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  const close = (): void => {
    closeMenu?.();
    closeMenu = undefined;
  };
  const clearLongPress = (): void => {
    if (longPressTimer === undefined) return;
    clearTimeout(longPressTimer);
    longPressTimer = undefined;
  };
  return new Plugin({
    view: () => ({
      destroy: () => {
        clearLongPress();
        close();
      },
    }),
    props: {
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const openMenu = (clientX: number, clientY: number): boolean => {
            const position = view.posAtCoords({left: clientX, top: clientY})?.pos;
            if (position === undefined) return false;
          const selection = TextSelection.create(view.state.doc, position);
          const transaction = view.state.tr.setSelection(selection);
          const selectedState = view.state.apply(transaction);
          if (!addTableRow(selectedState)) return false;
          let bodyRows = 0;
          let rowCells = 0;
          for (let depth = 1; depth <= selectedState.selection.$from.depth; depth += 1) {
            const node = selectedState.selection.$from.node(depth);
            if (node.type.name === TableNode.Body) bodyRows = node.childCount;
            if (node.type.name === TableNode.Row) rowCells = node.childCount;
          }
          close();
          view.dispatch(transaction);

          const controls = document.createElement('div');
          controls.className = 'markdown-editor__table-popover';
          controls.setAttribute('aria-label', 'Действия с таблицей');
          controls.setAttribute('role', 'menu');
          const actions = [
            ['add-row', 'Добавить строку', addTableRow, false],
            ['add-column', 'Добавить колонку', addTableColumn, false],
            ['delete-row', 'Удалить строку', deleteTableRow, true, bodyRows === 1],
            ['delete-column', 'Удалить колонку', deleteTableColumn, true, rowCells === 1],
            ['delete-table', 'Удалить таблицу', deleteTable, true],
            ['align-left', 'Выровнять по левому краю', setTableColumnAlignment(TableCellAlign.Left), false],
            ['align-center', 'Выровнять по центру', setTableColumnAlignment(TableCellAlign.Center), false],
            ['align-right', 'Выровнять по правому краю', setTableColumnAlignment(TableCellAlign.Right), false],
          ] as const;
          for (const [name, label, command, destructive, disabled = false] of actions) {
            const button = document.createElement('button');
            button.className = destructive
              ? 'markdown-editor__table-popover-action markdown-editor__table-popover-action--danger'
              : 'markdown-editor__table-popover-action';
            button.dataset.tableAction = name;
            button.disabled = disabled;
            button.setAttribute('role', 'menuitem');
            button.textContent = label;
            button.type = 'button';
            button.addEventListener('mousedown', (mouseEvent) => mouseEvent.preventDefault());
            button.addEventListener('click', () => {
              command(view.state, view.dispatch);
              close();
            });
            controls.append(button);
          }
          const editor = view.dom.closest<HTMLElement>('.markdown-editor');
          if (editor !== null) {
            const editorStyles = getComputedStyle(editor);
            for (const name of ['--markdown-background', '--markdown-border', '--markdown-text']) {
              controls.style.setProperty(name, editorStyles.getPropertyValue(name));
            }
          }
          document.body.append(controls);
          const {left, top} = view.coordsAtPos(position);
          Object.assign(controls.style, {left: `${left}px`, position: 'fixed', top: `${top + 8}px`});
          const closeOutside = (pointerEvent: PointerEvent): void => {
            if (pointerEvent.target instanceof Node && controls.contains(pointerEvent.target)) return;
            close();
          };
          document.addEventListener('pointerdown', closeOutside, true);
          closeMenu = () => {
            document.removeEventListener('pointerdown', closeOutside, true);
            controls.remove();
          };
          return true;
          };
          if (!openMenu(event.clientX, event.clientY)) return false;
          event.preventDefault();
          return true;
        },
        touchstart: (view, event) => {
          const touch = event.touches[0];
          if (touch === undefined) return false;
          clearLongPress();
          longPressTimer = window.setTimeout(() => {
            longPressTimer = undefined;
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target === null || !view.dom.contains(target)) return;
            target.dispatchEvent(new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: touch.clientX,
              clientY: touch.clientY,
            }));
          }, TABLE_LONG_PRESS_DELAY);
          return false;
        },
        touchcancel: () => {
          clearLongPress();
          return false;
        },
        touchend: () => {
          clearLongPress();
          return false;
        },
        touchmove: () => {
          clearLongPress();
          return false;
        },
      },
    },
  });
}

function createFoldingPlugin(): Plugin<DecorationSet> {
  const createDecorations = (document: ProseMirrorNode): DecorationSet => {
    const decorations: Decoration[] = [];
    let foldedLevel: number | undefined;

    document.forEach((node, offset) => {
      if (node.type.name === "heading") {
        const level = Number(node.attrs.level);
        if (foldedLevel !== undefined && level <= foldedLevel) {
          foldedLevel = undefined;
        }
        if (node.attrs.folding === true) {
          foldedLevel = level;
        }
      } else if (foldedLevel !== undefined) {
        decorations.push(
          Decoration.node(offset, offset + node.nodeSize, {
            class: "markdown-editor__folded-content",
          }),
        );
      }
    });

    return DecorationSet.create(document, decorations);
  };

  return new Plugin({
    key: foldingPluginKey,
    props: {
      decorations: (state) => foldingPluginKey.getState(state),
    },
    state: {
      apply: (transaction, previous) =>
        transaction.docChanged
          ? createDecorations(transaction.doc)
          : previous.map(transaction.mapping, transaction.doc),
      init: (_config, state) => createDecorations(state.doc),
    },
  });
}

const toggleHeadingFolding = toggleFoldingHeading;

function insertMathBlockAndEdit(state: EditorState, dispatch?: (transaction: Transaction) => void): boolean {
  const {$from, empty} = state.selection;
  if (!empty || !$from.parent.isTextblock || $from.parent.content.size !== 0) return false;
  if (dispatch !== undefined) {
    const position = $from.before();
    const transaction = state.tr.replaceWith(
      position,
      $from.after(),
      getNodeType("math_block").create({latex: defaultMathLatex}),
    );
    transaction.setMeta(atomicSourcePluginKey, transaction.mapping.map(position, -1)).scrollIntoView();
    dispatch(transaction);
  }
  return true;
}

function insertInlineMathAndEdit(state: EditorState, dispatch?: (transaction: Transaction) => void): boolean {
  if (dispatch !== undefined) {
    const position = state.selection.from;
    const transaction = state.tr.replaceSelectionWith(
      getNodeType("inline_math").create({latex: defaultMathLatex}),
    );
    transaction.setMeta(atomicSourcePluginKey, transaction.mapping.map(position, -1)).scrollIntoView();
    dispatch(transaction);
  }
  return true;
}

/** Framework-agnostic commands consumed later by the Vue toolbar and shortcuts. */
export function createBasicEditorCommands(): BasicEditorCommands {
  const historyActions = createHistoryActions();
  const listItem = getNodeType("list_item");

  return {
    addMathInline: insertInlineMathAndEdit,
    addTableColumn,
    addTableRow,
    bold: toggleBold,
    bulletList: toList(getNodeType("bullet_list")),
    code: toggleCode,
    codeBlock: setCodeBlock,
    deleteTableColumn,
    deleteTable,
    deleteTableRow,
    heading: toHeading,
    horizontalRule: addHorizontalRule(getNodeType("horizontal_rule")),
    insertFile: insertFileCommand,
    insertImage: insertImageCommand,
    insertMathBlock: insertMathBlockAndEdit,
    insertInlineMath: insertInlineMathAndEdit,
    insertTable: createTableCommand,
    italic: toggleItalic,
    link: (href) => toggleLink(href),
    mark: toggleMark(getMarkType("mark")),
    orderedList: toList(getNodeType("ordered_list")),
    paragraph: setBlockType(getNodeType("paragraph")),
    quote: toggleQuote,
    redo: historyActions.redo,
    setColor: setColorCommand,
    liftListItem: liftListItem(listItem),
    sinkListItem: sinkOnlySelectedListItem(listItem),
    splitListItem: splitListItem(listItem),
    strikethrough: toggleMark(getMarkType("strikethrough")),
    toMathBlock: insertMathBlockAndEdit,
    toggleHeadingFolding,
    underline: toggleMark(getMarkType("underline")),
    undo: historyActions.undo,
  };
}

function hasActiveMark(state: EditorState, markName: string): boolean {
  const mark = getMarkType(markName);
  const { empty, from, to, $from } = state.selection;

  return empty
    ? Boolean(mark.isInSet(state.storedMarks ?? $from.marks()))
    : state.doc.rangeHasMark(from, to, mark);
}

function hasAncestor(state: EditorState, nodeName: string): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === nodeName) {
      return true;
    }
  }
  return false;
}

/**
 * The upstream list command may correctly return `false` when an item cannot
 * be nested any deeper. In an editable list, Tab must still stay in the
 * ProseMirror surface instead of moving browser focus to the next control.
 */
function keepListFocus(command: Command): Command {
  return (state, dispatch, view) => {
    if (!hasAncestor(state, "list_item")) return false;
    command(state, dispatch, view);
    return true;
  };
}

export function getBasicWysiwygSelectionState(
  state: EditorState,
): BasicWysiwygSelectionState {
  const { $from } = state.selection;
  const atomicSourcePosition = atomicSourcePluginKey.getState(state);
  const atomicSourceNode =
    atomicSourcePosition === null || atomicSourcePosition === undefined
      ? undefined
      : findAtomicSourceNode(state.doc, atomicSourcePosition)?.node;

  return {
    bold: hasActiveMark(state, "strong"),
    bulletList: hasAncestor(state, "bullet_list"),
    code: hasActiveMark(state, "code"),
    codeBlock: hasAncestor(state, "code_block"),
    formula:
      atomicSourceNode?.type.name === "inline_math" ||
      atomicSourceNode?.type.name === "math_block",
    headingLevel:
      $from.parent.type.name === "heading"
        ? Number($from.parent.attrs.level)
        : undefined,
    headingFolded:
      $from.parent.type.name === "heading" &&
      $from.parent.attrs.folding === true,
    italic: hasActiveMark(state, "em"),
    mark: hasActiveMark(state, "mark"),
    orderedList: hasAncestor(state, "ordered_list"),
    quote: hasAncestor(state, "blockquote"),
    strikethrough: hasActiveMark(state, "strikethrough"),
    underline: hasActiveMark(state, "underline"),
  };
}

export interface BasicWysiwygEditor {
  destroy(): void;
  focus(): void;
  getValue(): string;
  run(command: Command): boolean;
  setValue(value: string): void;
}

export interface MountBasicWysiwygEditorOptions {
  editable?: boolean;
  initialValue?: string;
  onChange?(value: string): void;
  onFiles?(files: readonly File[]): void;
  onSelectionChange?(selection: BasicWysiwygSelectionState): void;
  placeholder?: string;
  plugins?: readonly Plugin[];
  selectionContext?: SelectionContextOptions;
  target: HTMLElement;
}

/**
 * Temporary visual host for the playground. The public Vue component is added
 * in task 7, after markup/split lifecycle management is available.
 */
export function mountBasicWysiwygEditor({
  editable = true,
  initialValue = "",
  onChange,
  onFiles,
  onSelectionChange,
  placeholder = "",
  plugins = [],
  selectionContext,
  target,
}: MountBasicWysiwygEditorOptions): BasicWysiwygEditor {
  const commands = createBasicEditorCommands();
  const listItem = basicMarkdownSchema.nodes.list_item;
  if (listItem === undefined) {
    throw new Error("The basic Markdown schema must contain list_item");
  }
  let view: EditorView;
  const editorState = EditorState.create({
    doc: basicMarkdownCodec.parse(initialValue),
    plugins: [
      createAtomicSourceEditorPlugin(),
      createUpstreamTableControlsPlugin(),
      createMarkdownTablePastePlugin(),
      ...createBasicDefaultPresetPlugins(placeholder, onFiles, selectionContext),
      keymap({
        "Mod-[": commands.liftListItem,
        "Mod-]": commands.sinkListItem,
        "Shift-Tab": commands.liftListItem,
        Backspace: chainCommands(liftEmptyListItem(listItem), joinPrevList),
        Enter: commands.splitListItem,
        Tab: keepListFocus(commands.sinkListItem),
        "Mod-Shift-z": commands.redo,
        "Mod-z": commands.undo,
      }),
      ...plugins,
    ],
  });
  for (const plugin of editorState.plugins) {
    const getDecorations = plugin.props.decorations;
    if (getDecorations !== undefined) {
      plugin.props.decorations = (state) => {
        const decorations = getDecorations.call(plugin, state);
        return decorations instanceof DecorationSet ? decorations : DecorationSet.empty;
      };
    }
  }
  view = new EditorView(target, {
    dispatchTransaction(transaction) {
      const state = view.state.apply(transaction);
      view.updateState(state);
      if (transaction.docChanged) {
        onChange?.(basicMarkdownCodec.serialize(state.doc));
      }
      onSelectionChange?.(getBasicWysiwygSelectionState(state));
    },
    editable: () => editable,
    state: editorState,
  });
  const contentHandler = new WysiwygContentHandler(view, basicMarkdownCodec);
  onSelectionChange?.(getBasicWysiwygSelectionState(view.state));

  return {
    destroy: () => view.destroy(),
    focus: () => view.focus(),
    getValue: () => basicMarkdownCodec.serialize(view.state.doc),
    run: (command) => {
      const result = command(view.state, view.dispatch, view);
      view.focus();
      return result;
    },
    setValue: (value) => {
      if (value === basicMarkdownCodec.serialize(view.state.doc)) {
        return;
      }
      contentHandler.replace(value);
    },
  };
}
