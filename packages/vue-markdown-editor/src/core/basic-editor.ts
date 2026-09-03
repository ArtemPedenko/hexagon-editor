import { chainCommands, setBlockType, toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import type { Plugin, Transaction } from 'prosemirror-state';
import { liftListItem, splitListItem } from 'prosemirror-schema-list';
import { DecorationSet, EditorView } from 'prosemirror-view';
import type { NodeViewConstructor } from 'prosemirror-view';
import { h, reactive, render } from 'vue';
import type { AppContext } from 'vue';

import 'prosemirror-view/style/prosemirror.css';

import { basicMarkdownCodec, basicMarkdownSchema } from './basic-editor-markdown';
export { basicMarkdownCodec, basicMarkdownSchema } from './basic-editor-markdown';
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
  setBackgroundColorCommand,
  setColorCommand,
  setImageDisplayCommand,
} from './basic-editor-command-helpers';
import { getBasicWysiwygSelectionState as getSelectionState, keepListFocus } from './basic-editor-selection';
import {
  createBasicDefaultPresetPlugins,
  createMarkdownTablePastePlugin as createTablePastePlugin,
} from './basic-editor-runtime-plugins';
import { WysiwygContentHandler } from './content-handler';
import { joinPrevList, liftEmptyListItem, sinkOnlySelectedListItem, toList } from './lists';
import { createUpstreamTableControlsPlugin } from './basic-editor-table-controls';
import { createHistoryActions } from '../extensions/behavior/history';
import { toggleQuote } from '../extensions/markdown/blockquote';
import { toggleBold } from '../extensions/markdown/bold';
import { toggleItalic } from '../extensions/markdown/italic';
import { toggleCode } from '../extensions/markdown/code';
import { setCodeBlock, setCodeBlockLanguage } from '../extensions/markdown/code-block';
import { toHeading } from '../extensions/markdown/heading';
import { addHorizontalRule } from '../extensions/markdown/horizontal-rule';
import { removeCurrentLink, setLink, toggleLink } from '../extensions/markdown/link';
import { toggleStrike } from '../extensions/markdown/strike';
import type {
  BasicEditorCommands,
  BasicWysiwygEditor,
  BasicWysiwygSelectionState,
  MountBasicWysiwygEditorOptions,
} from './basic-editor-types';

export type {
  BasicEditorCommands,
  BasicWysiwygEditor,
  BasicWysiwygSelectionState,
  MountBasicWysiwygEditorOptions,
} from './basic-editor-types';
import {
  addTableColumn,
  addTableRow,
  deleteTable,
  deleteTableColumn,
  deleteTableRow,
} from '../extensions/markdown/table';
import { toggleFoldingHeading } from '../extensions/additional/folding-heading';
import { defaultMathLatex } from '../extensions/additional/math';
import { insertMermaid } from '../extensions/additional/mermaid';
import type { MarkdownDirectiveComponentProps, MarkdownDirectiveComponents } from '../directives';
import { createFeatureNodeViews } from './basic-editor-renderers';

export function createMarkdownTablePastePlugin(): Plugin {
  return createTablePastePlugin(basicMarkdownCodec);
}

const toggleHeadingFolding = toggleFoldingHeading;

function insertMathBlockAndEdit(state: EditorState, dispatch?: (transaction: Transaction) => void): boolean {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock) return false;
  const node = getBasicNodeType(state.schema, 'math_block').create({
    latex: defaultMathLatex,
  });
  const replaceCurrentBlock = $from.parent.content.size === 0;
  const position = replaceCurrentBlock ? $from.before() : $from.after();
  if (dispatch !== undefined) {
    const transaction = replaceCurrentBlock
      ? state.tr.replaceWith(position, $from.after(), node)
      : state.tr.insert(position, node);
    transaction.setMeta(atomicSourcePluginKey, transaction.mapping.map(position, -1)).scrollIntoView();
    dispatch(transaction);
  }
  return true;
}

function insertInlineMathAndEdit(state: EditorState, dispatch?: (transaction: Transaction) => void): boolean {
  if (dispatch !== undefined) {
    const position = state.selection.from;
    const transaction = state.tr.replaceSelectionWith(
      getBasicNodeType(basicMarkdownSchema, 'inline_math').create({
        latex: defaultMathLatex,
      }),
    );
    transaction.setMeta(atomicSourcePluginKey, transaction.mapping.map(position, -1)).scrollIntoView();
    dispatch(transaction);
  }
  return true;
}

function insertHtmlAndEdit(state: EditorState, dispatch?: (transaction: Transaction) => void): boolean {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock) return false;
  const node = getBasicNodeType(basicMarkdownSchema, 'directive').create({
    content: '<div>Add HTML code here</div>',
    name: 'html',
  });
  const replaceCurrentBlock = $from.parent.content.size === 0;
  const position = replaceCurrentBlock ? $from.before() : $from.after();
  if (dispatch !== undefined) {
    const transaction = replaceCurrentBlock
      ? state.tr.replaceWith(position, $from.after(), node)
      : state.tr.insert(position, node);
    transaction.setMeta(atomicSourcePluginKey, transaction.mapping.map(position, -1)).scrollIntoView();
    dispatch(transaction);
  }
  return true;
}

/** Framework-agnostic commands consumed later by the Vue toolbar and shortcuts. */
export function createBasicEditorCommands(): BasicEditorCommands {
  const historyActions = createHistoryActions();
  const listItem = getBasicNodeType(basicMarkdownSchema, 'list_item');

  return {
    addMathInline: insertInlineMathAndEdit,
    addTableColumn,
    addTableRow,
    bold: toggleBold,
    bulletList: toList(getBasicNodeType(basicMarkdownSchema, 'bullet_list')),
    code: toggleCode,
    codeBlock: setCodeBlock,
    setCodeBlockLanguage,
    deleteTableColumn,
    deleteTable,
    deleteTableRow,
    heading: toHeading,
    horizontalRule: addHorizontalRule(getBasicNodeType(basicMarkdownSchema, 'horizontal_rule')),
    insertFile: (href, name) => insertFileCommand(basicMarkdownSchema, href, name),
    insertHtml: insertHtmlAndEdit,
    insertImage: (src, alt, title) => insertImageCommand(basicMarkdownSchema, src, alt, title),
    setImageDisplay: setImageDisplayCommand,
    insertMathBlock: insertMathBlockAndEdit,
    insertInlineMath: insertInlineMathAndEdit,
    insertMermaid,
    insertTable: createTableCommand,
    italic: toggleItalic,
    link: (href) => toggleLink(href),
    removeLink: removeCurrentLink,
    setLink: (href, title, text, openInNewWindow) => setLink(href, title, text, openInNewWindow),
    mark: toggleMark(getBasicMarkType(basicMarkdownSchema, 'mark')),
    orderedList: toList(getBasicNodeType(basicMarkdownSchema, 'ordered_list')),
    paragraph: setBlockType(getBasicNodeType(basicMarkdownSchema, 'paragraph')),
    quote: toggleQuote,
    redo: historyActions.redo,
    setBackgroundColor: (color) => setBackgroundColorCommand(basicMarkdownSchema, color),
    setColor: (color) => setColorCommand(basicMarkdownSchema, color),
    liftListItem: liftListItem(listItem),
    sinkListItem: sinkOnlySelectedListItem(listItem),
    splitListItem: splitListItem(listItem),
    strikethrough: toggleStrike,
    toMathBlock: insertMathBlockAndEdit,
    toggleHeadingFolding,
    underline: toggleMark(getBasicMarkType(basicMarkdownSchema, 'underline')),
    undo: historyActions.undo,
  };
}

export function getBasicWysiwygSelectionState(state: EditorState): BasicWysiwygSelectionState {
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
  directiveAppContext,
  directiveComponents,
  features = {},
  editable = true,
  initialValue = '',
  onCancel,
  onChange,
  onSelectionChange,
  onSubmit,
  placeholder = '',
  plugins = [],
  selectionContext,
  target,
}: MountBasicWysiwygEditorOptions): BasicWysiwygEditor {
  const commands = createBasicEditorCommands();
  const listItem = basicMarkdownSchema.nodes.list_item;
  if (listItem === undefined) {
    throw new Error('The basic Markdown schema must contain list_item');
  }
  let view: EditorView;
  const editorState = EditorState.create({
    doc: basicMarkdownCodec.parse(initialValue),
    plugins: [
      createAtomicSourceEditorPlugin(),
      createUpstreamTableControlsPlugin(),
      createMarkdownTablePastePlugin(),
      ...createBasicDefaultPresetPlugins(basicMarkdownSchema, placeholder, selectionContext, onCancel, onSubmit),
      keymap({
        'Mod-[': commands.liftListItem,
        'Mod-]': commands.sinkListItem,
        'Shift-Tab': commands.liftListItem,
        Backspace: chainCommands(liftEmptyListItem(listItem), joinPrevList),
        Enter: commands.splitListItem,
        Tab: keepListFocus(commands.sinkListItem),
        'Mod-Shift-z': commands.redo,
        'Mod-z': commands.undo,
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
    nodeViews: {
      ...createFeatureNodeViews(features),
      ...(directiveComponents === undefined
        ? {}
        : {
            directive: createDirectiveNodeView(directiveComponents, editable, directiveAppContext),
          }),
    },
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
    selectElement: (element) => {
      const from = view.posAtDOM(element, 0);
      const node = view.state.doc.nodeAt(from);
      if (node !== null && NodeSelection.isSelectable(node)) {
        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, from)));
        return;
      }
      const to = from + (element.textContent?.length ?? 0);
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
    },
    setValue: (value) => {
      if (value === basicMarkdownCodec.serialize(view.state.doc)) {
        return;
      }
      contentHandler.replace(value);
    },
  };
}

function createDirectiveNodeView(
  components: MarkdownDirectiveComponents,
  editable: boolean,
  appContext?: AppContext,
): NodeViewConstructor {
  return (node, view, getPos) => {
    const dom = document.createElement('div');
    dom.setAttribute('data-directive', String(node.attrs.name));
    const mountTarget = document.createElement('div');
    dom.append(mountTarget);
    const state = reactive({ node, selected: false });

    const updateContent = (content: string): void => {
      if (!editable) return;
      const position = getPos();
      if (position === undefined) return;
      view.dispatch(
        view.state.tr.setNodeMarkup(position, undefined, {
          ...state.node.attrs,
          content,
        }),
      );
    };
    const renderComponent = (): void => {
      const name = String(state.node.attrs.name);
      const component = components[name];
      dom.setAttribute('data-directive', name);
      if (component === undefined) {
        render(null, mountTarget);
        mountTarget.textContent = String(state.node.attrs.content);
        return;
      }
      const props: MarkdownDirectiveComponentProps = {
        content: String(state.node.attrs.content),
        name,
        readonly: !editable,
        updateContent,
      };
      const vnode = h(component, props);
      vnode.appContext = appContext ?? null;
      render(vnode, mountTarget);
    };

    renderComponent();
    return {
      deselectNode: () => {
        state.selected = false;
        dom.removeAttribute('data-selected');
      },
      destroy: () => {
        render(null, mountTarget);
        dom.remove();
      },
      dom,
      selectNode: () => {
        state.selected = true;
        dom.setAttribute('data-selected', '');
      },
      stopEvent: () => true,
      update: (nextNode) => {
        if (nextNode.type !== state.node.type) return false;
        state.node = nextNode;
        renderComponent();
        return true;
      },
    };
  };
}
