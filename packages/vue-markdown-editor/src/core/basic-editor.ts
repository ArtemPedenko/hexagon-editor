import {
  chainCommands,
  setBlockType,
  toggleMark,
} from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import type {Transaction} from "prosemirror-state";
import type { Command } from "prosemirror-state";
import {
  liftListItem,
  splitListItem,
} from "prosemirror-schema-list";
import {tableEditing} from "prosemirror-tables";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

import "prosemirror-view/style/prosemirror.css";
import "katex/dist/katex.min.css";

import {basicMarkdownCodec, basicMarkdownSchema} from "./basic-editor-markdown";
export {basicMarkdownCodec, basicMarkdownSchema} from './basic-editor-markdown';
import {
  atomicSourcePluginKey,
  createAtomicSourceEditorPlugin,
  findAtomicSourceNode,
} from './basic-editor-atomic-source';
import {
  createTableCommand,
  getBasicMarkType,
  getBasicNodeType,
  insertFileCommand,
  insertImageCommand,
  setColorCommand,
  setImageDisplayCommand,
} from "./basic-editor-command-helpers";
import {
  getBasicWysiwygSelectionState as getSelectionState,
  keepListFocus,
} from "./basic-editor-selection";
import {
  createBasicDefaultPresetPlugins,
  createMarkdownTablePastePlugin as createTablePastePlugin,
} from "./basic-editor-runtime-plugins";
import { WysiwygContentHandler } from "./content-handler";
import {
  joinPrevList,
  liftEmptyListItem,
  sinkOnlySelectedListItem,
  toList,
} from "./lists";
import {createUpstreamTableControlsPlugin} from './basic-editor-table-controls';
import { createHistoryActions } from "../extensions/behavior/history";
import {toggleQuote} from "../extensions/markdown/blockquote";
import {toggleBold} from "../extensions/markdown/bold";
import {toggleItalic} from "../extensions/markdown/italic";
import {toggleCode} from "../extensions/markdown/code";
import {
  setCodeBlock,
  setCodeBlockLanguage,
} from "../extensions/markdown/code-block";
import { toHeading } from "../extensions/markdown/heading";
import {
  addHorizontalRule,
} from "../extensions/markdown/horizontal-rule";
import {
  removeCurrentLink,
  setLink,
  toggleLink,
} from "../extensions/markdown/link";
import {toggleStrike} from '../extensions/markdown/strike';
import type {
  BasicEditorCommands,
  BasicWysiwygEditor,
  BasicWysiwygSelectionState,
  MountBasicWysiwygEditorOptions,
} from "./basic-editor-types";

export type {
  BasicEditorCommands,
  BasicWysiwygEditor,
  BasicWysiwygSelectionState,
  MountBasicWysiwygEditorOptions,
} from "./basic-editor-types";
import {
  addTableColumn,
  addTableRow,
  deleteTable,
  deleteTableColumn,
  deleteTableRow,
} from "../extensions/markdown/table";
import {toggleFoldingHeading} from '../extensions/additional/folding-heading';
import {defaultMathLatex} from '../extensions/additional/math';

export function createMarkdownTablePastePlugin(): Plugin {
  return createTablePastePlugin(basicMarkdownCodec);
}

const foldingPluginKey = new PluginKey<DecorationSet>("legacy-folding-heading");
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
      getBasicNodeType(basicMarkdownSchema, "math_block").create({latex: defaultMathLatex}),
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
      getBasicNodeType(basicMarkdownSchema, "inline_math").create({latex: defaultMathLatex}),
    );
    transaction.setMeta(atomicSourcePluginKey, transaction.mapping.map(position, -1)).scrollIntoView();
    dispatch(transaction);
  }
  return true;
}

/** Framework-agnostic commands consumed later by the Vue toolbar and shortcuts. */
export function createBasicEditorCommands(): BasicEditorCommands {
  const historyActions = createHistoryActions();
  const listItem = getBasicNodeType(basicMarkdownSchema, "list_item");

  return {
    addMathInline: insertInlineMathAndEdit,
    addTableColumn,
    addTableRow,
    bold: toggleBold,
    bulletList: toList(getBasicNodeType(basicMarkdownSchema, "bullet_list")),
    code: toggleCode,
    codeBlock: setCodeBlock,
    setCodeBlockLanguage,
    deleteTableColumn,
    deleteTable,
    deleteTableRow,
    heading: toHeading,
    horizontalRule: addHorizontalRule(getBasicNodeType(basicMarkdownSchema, "horizontal_rule")),
    insertFile: (href, name) => insertFileCommand(basicMarkdownSchema, href, name),
    insertImage: (src, alt, title) => insertImageCommand(basicMarkdownSchema, src, alt, title),
    setImageDisplay: setImageDisplayCommand,
    insertMathBlock: insertMathBlockAndEdit,
    insertInlineMath: insertInlineMathAndEdit,
    insertTable: createTableCommand,
    italic: toggleItalic,
    link: (href) => toggleLink(href),
    removeLink: removeCurrentLink,
    setLink: (href, title, text, openInNewWindow) => setLink(href, title, text, openInNewWindow),
    mark: toggleMark(getBasicMarkType(basicMarkdownSchema, "mark")),
    orderedList: toList(getBasicNodeType(basicMarkdownSchema, "ordered_list")),
    paragraph: setBlockType(getBasicNodeType(basicMarkdownSchema, "paragraph")),
    quote: toggleQuote,
    redo: historyActions.redo,
    setColor: (color) => setColorCommand(basicMarkdownSchema, color),
    liftListItem: liftListItem(listItem),
    sinkListItem: sinkOnlySelectedListItem(listItem),
    splitListItem: splitListItem(listItem),
    strikethrough: toggleStrike,
    toMathBlock: insertMathBlockAndEdit,
    toggleHeadingFolding,
    underline: toggleMark(getBasicMarkType(basicMarkdownSchema, "underline")),
    undo: historyActions.undo,
  };
}

export function getBasicWysiwygSelectionState(
  state: EditorState,
): BasicWysiwygSelectionState {
  const atomicSourcePosition = atomicSourcePluginKey.getState(state);
  const atomicSourceNode =
    atomicSourcePosition === null || atomicSourcePosition === undefined
      ? undefined
      : findAtomicSourceNode(state.doc, atomicSourcePosition)?.node;
  return getSelectionState(state, basicMarkdownSchema, atomicSourceNode);
}

/**
 * Temporary visual host for the playground. The public Vue component is added
 * in task 7, after markup/split lifecycle management is available.
 */
export function mountBasicWysiwygEditor({
  editable = true,
  initialValue = "",
  onCancel,
  onChange,
  onSelectionChange,
  onSubmit,
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
      ...createBasicDefaultPresetPlugins(
        basicMarkdownSchema,
        placeholder,
        selectionContext,
        onCancel,
        onSubmit,
      ),
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
    hasFocus: () => view.hasFocus(),
    insert: (markup) => contentHandler.insert(markup),
    moveCursor: (position) => contentHandler.moveCursor(position),
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
