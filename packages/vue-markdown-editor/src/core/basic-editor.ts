import {baseKeymap, setBlockType, toggleMark, wrapIn} from 'prosemirror-commands';
import {history, redo, undo} from 'prosemirror-history';
import {keymap} from 'prosemirror-keymap';
import MarkdownIt from 'markdown-it';
import {Schema} from 'prosemirror-model';
import type {MarkSpec, Node as ProseMirrorNode, NodeSpec} from 'prosemirror-model';
import {
    defaultMarkdownParser,
    defaultMarkdownSerializer,
    MarkdownParser,
    MarkdownSerializer,
} from 'prosemirror-markdown';
import type {ParseSpec} from 'prosemirror-markdown';
import {EditorState} from 'prosemirror-state';
import type {Command} from 'prosemirror-state';
import {liftListItem, sinkListItem, splitListItem, wrapInList} from 'prosemirror-schema-list';
import {tableEditing, tableNodes} from 'prosemirror-tables';
import {EditorView} from 'prosemirror-view';

import 'prosemirror-view/style/prosemirror.css';

import {defaultMarkdownSchema, MarkdownCodec} from './markdown';

const basicMarks: Record<string, MarkSpec> = {
    mark: {
        parseDOM: [{tag: 'mark'}, {tag: 'span[data-mark]'}],
        toDOM: () => ['mark', 0],
    },
    strikethrough: {
        parseDOM: [{tag: 's'}, {tag: 'del'}, {style: 'text-decoration=line-through'}],
        toDOM: () => ['s', 0],
    },
    underline: {
        parseDOM: [{tag: 'u'}, {style: 'text-decoration=underline'}],
        toDOM: () => ['u', 0],
    },
};

const markdownTableNodes: Record<string, NodeSpec> = tableNodes({
    cellAttributes: {},
    cellContent: 'inline*',
    tableGroup: 'block',
});

/** Schema for the first WYSIWYG milestone. YFM-specific nodes are added later. */
export const basicMarkdownSchema: Schema = new Schema({
    marks: defaultMarkdownSchema.spec.marks.append(basicMarks),
    nodes: defaultMarkdownSchema.spec.nodes.append(markdownTableNodes),
});

const tableTokenSpecs: Record<string, ParseSpec> = {
    table: {block: 'table'},
    tbody: {ignore: true},
    td: {block: 'table_cell'},
    th: {block: 'table_header'},
    thead: {ignore: true},
    tr: {block: 'table_row'},
};

const basicMarkdownParser = new MarkdownParser(
    basicMarkdownSchema,
    new MarkdownIt('commonmark', {html: false}).enable('table'),
    {...defaultMarkdownParser.tokens, ...tableTokenSpecs},
);

const basicMarkdownSerializer = new MarkdownSerializer(
    {
        ...defaultMarkdownSerializer.nodes,
        table(state, node) {
            const rows = Array.from(node.content.content, (row) =>
                Array.from(row.content.content, (cell) => escapeTableCell(cell.textContent)),
            );
            const firstRow = rows.at(0) ?? [];
            const body = rows.slice(1);
            const header = `| ${firstRow.join(' | ')} |`;
            const divider = `| ${firstRow.map(() => '---').join(' | ')} |`;

            state.write([header, divider, ...body.map((row) => `| ${row.join(' | ')} |`)].join('\n'));
            state.closeBlock(node);
        },
    },
    {
        ...defaultMarkdownSerializer.marks,
        mark: {close: '==', open: '=='},
        strikethrough: {close: '~~', open: '~~'},
        underline: {close: '</u>', open: '<u>'},
    },
);

export const basicMarkdownCodec = new MarkdownCodec({
    parser: basicMarkdownParser,
    serializer: basicMarkdownSerializer,
});

function escapeTableCell(value: string): string {
    return value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

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

function createTable(rows: number, columns: number): ProseMirrorNode {
    const cellType = getNodeType('table_cell');
    const rowType = getNodeType('table_row');
    const tableType = getNodeType('table');
    const rowNodes = Array.from({length: rows}, () => {
        const cells = Array.from({length: columns}, () => {
            const cell = cellType.createAndFill();
            if (cell === null) {
                throw new Error('Cannot create a basic editor table cell');
            }
            return cell;
        });
        const row = rowType.createAndFill(null, cells);
        if (row === null) {
            throw new Error('Cannot create a basic editor table row');
        }
        return row;
    });

    const table = tableType.createAndFill(null, rowNodes);
    if (table === null) {
        throw new Error('Cannot create a basic editor table');
    }
    return table;
}

function createTableCommand(rows = 3, columns = 3): Command {
    return (state, dispatch) => {
        if (dispatch !== undefined) {
            dispatch(state.tr.replaceSelectionWith(createTable(rows, columns)).scrollIntoView());
        }
        return true;
    };
}

export interface BasicEditorCommands {
    bold: Command;
    bulletList: Command;
    code: Command;
    codeBlock: Command;
    heading(level: number): Command;
    horizontalRule: Command;
    insertTable(rows?: number, columns?: number): Command;
    italic: Command;
    link(href: string): Command;
    mark: Command;
    orderedList: Command;
    paragraph: Command;
    quote: Command;
    redo: Command;
    sinkListItem: Command;
    splitListItem: Command;
    strikethrough: Command;
    underline: Command;
    undo: Command;
}

export interface BasicWysiwygSelectionState {
    bold: boolean;
    bulletList: boolean;
    code: boolean;
    codeBlock: boolean;
    headingLevel: number | undefined;
    italic: boolean;
    mark: boolean;
    orderedList: boolean;
    quote: boolean;
    strikethrough: boolean;
    underline: boolean;
}

/** Framework-agnostic commands consumed later by the Vue toolbar and shortcuts. */
export function createBasicEditorCommands(): BasicEditorCommands {
    const listItem = getNodeType('list_item');

    return {
        bold: toggleMark(getMarkType('strong')),
        bulletList: wrapInList(getNodeType('bullet_list')),
        code: toggleMark(getMarkType('code')),
        codeBlock: setBlockType(getNodeType('code_block')),
        heading: (level) => setBlockType(getNodeType('heading'), {level}),
        horizontalRule: (state, dispatch) => {
            if (dispatch !== undefined) {
                dispatch(state.tr.replaceSelectionWith(getNodeType('horizontal_rule').create()).scrollIntoView());
            }
            return true;
        },
        insertTable: createTableCommand,
        italic: toggleMark(getMarkType('em')),
        link: (href) => toggleMark(getMarkType('link'), {href}),
        mark: toggleMark(getMarkType('mark')),
        orderedList: wrapInList(getNodeType('ordered_list')),
        paragraph: setBlockType(getNodeType('paragraph')),
        quote: wrapIn(getNodeType('blockquote')),
        redo,
        sinkListItem: sinkListItem(listItem),
        splitListItem: splitListItem(listItem),
        strikethrough: toggleMark(getMarkType('strikethrough')),
        underline: toggleMark(getMarkType('underline')),
        undo,
    };
}

function hasActiveMark(state: EditorState, markName: string): boolean {
    const mark = getMarkType(markName);
    const {empty, from, to, $from} = state.selection;

    return empty
        ? Boolean(mark.isInSet(state.storedMarks ?? $from.marks()))
        : state.doc.rangeHasMark(from, to, mark);
}

function hasAncestor(state: EditorState, nodeName: string): boolean {
    const {$from} = state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
        if ($from.node(depth).type.name === nodeName) {
            return true;
        }
    }
    return false;
}

export function getBasicWysiwygSelectionState(state: EditorState): BasicWysiwygSelectionState {
    const {$from} = state.selection;

    return {
        bold: hasActiveMark(state, 'strong'),
        bulletList: hasAncestor(state, 'bullet_list'),
        code: hasActiveMark(state, 'code'),
        codeBlock: hasAncestor(state, 'code_block'),
        headingLevel: $from.parent.type.name === 'heading' ? Number($from.parent.attrs.level) : undefined,
        italic: hasActiveMark(state, 'em'),
        mark: hasActiveMark(state, 'mark'),
        orderedList: hasAncestor(state, 'ordered_list'),
        quote: hasAncestor(state, 'blockquote'),
        strikethrough: hasActiveMark(state, 'strikethrough'),
        underline: hasActiveMark(state, 'underline'),
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
    onSelectionChange?(selection: BasicWysiwygSelectionState): void;
    target: HTMLElement;
}

/**
 * Temporary visual host for the playground. The public Vue component is added
 * in task 7, after markup/split lifecycle management is available.
 */
export function mountBasicWysiwygEditor({
    editable = true,
    initialValue = '',
    onChange,
    onSelectionChange,
    target,
}: MountBasicWysiwygEditorOptions): BasicWysiwygEditor {
    const commands = createBasicEditorCommands();
    let view: EditorView;
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
        state: EditorState.create({
            doc: basicMarkdownCodec.parse(initialValue),
            plugins: [
                history(),
                keymap({
                    'Mod-Shift-z': commands.redo,
                    'Mod-b': commands.bold,
                    'Mod-i': commands.italic,
                    'Mod-z': commands.undo,
                }),
                keymap(baseKeymap),
                tableEditing(),
            ],
        }),
    });
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

            view.updateState(
                EditorState.create({
                    doc: basicMarkdownCodec.parse(value),
                    plugins: [
                        history(),
                        keymap({
                            'Mod-Shift-z': commands.redo,
                            'Mod-b': commands.bold,
                            'Mod-i': commands.italic,
                            'Mod-z': commands.undo,
                        }),
                        keymap(baseKeymap),
                        tableEditing(),
                    ],
                }),
            );
            onSelectionChange?.(getBasicWysiwygSelectionState(view.state));
        },
    };
}
