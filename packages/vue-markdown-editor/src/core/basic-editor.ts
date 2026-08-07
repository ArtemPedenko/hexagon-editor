import {baseKeymap, setBlockType, toggleMark, wrapIn} from 'prosemirror-commands';
import {history, redo, undo} from 'prosemirror-history';
import {keymap} from 'prosemirror-keymap';
import katex from 'katex';
import MarkdownIt from 'markdown-it';
import deflist from 'markdown-it-deflist';
import {Schema} from 'prosemirror-model';
import type {MarkSpec, Node as ProseMirrorNode, NodeSpec} from 'prosemirror-model';
import {
    defaultMarkdownParser,
    defaultMarkdownSerializer,
    MarkdownParser,
    MarkdownSerializer,
} from 'prosemirror-markdown';
import type {ParseSpec} from 'prosemirror-markdown';
import {EditorState, Plugin, PluginKey} from 'prosemirror-state';
import type {Command} from 'prosemirror-state';
import {liftListItem, sinkListItem, splitListItem, wrapInList} from 'prosemirror-schema-list';
import {addColumnAfter, addRowAfter, CellSelection, findTable, tableEditing, TableMap, tableNodes} from 'prosemirror-tables';
import {Decoration, DecorationSet, EditorView} from 'prosemirror-view';

import 'prosemirror-view/style/prosemirror.css';
import 'katex/dist/katex.min.css';

import {defaultMarkdownSchema, MarkdownCodec} from './markdown';
import {getAdvancedMarkdownRenderers} from './optional-renderers';

const basicMarks: Record<string, MarkSpec> = {
    color: {
        attrs: {color: {}},
        parseDOM: [{style: 'color', getAttrs: (color) => ({color})}],
        toDOM: (mark) => ['span', {style: `color: ${mark.attrs.color}`}, 0],
    },
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

function renderHtmlBlock(html: string, attribute: string): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute(attribute, '');
    element.innerHTML = html;
    return element;
}

function renderOptionalBlock(kind: 'math' | 'mermaid', source: string, display = true): HTMLElement {
    const renderers = getAdvancedMarkdownRenderers();
    if (kind === 'math' && renderers.math !== undefined) return renderers.math(source, display);
    if (kind === 'mermaid' && renderers.mermaid !== undefined) return renderers.mermaid(source);
    const element = document.createElement(kind === 'math' && !display ? 'span' : 'pre');
    element.setAttribute(`data-${kind}${kind === 'math' ? display ? '-block' : '-inline' : ''}`, '');
    if (kind === 'math') {
        element.innerHTML = katex.renderToString(source, {displayMode: display, throwOnError: false});
    } else {
        element.textContent = source;
    }
    return element;
}

function renderYfmHtml(source: string): HTMLElement {
    const renderer = getAdvancedMarkdownRenderers().html;
    if (renderer !== undefined) return renderer(source);
    const element = document.createElement('pre');
    element.setAttribute('data-yfm-html', '');
    element.textContent = source;
    return element;
}

const extendedMarkdownNodes: Record<string, NodeSpec> = {
    inline_math: {atom: true, attrs: {latex: {default: ''}}, group: 'inline', inline: true, toDOM: (node) => renderOptionalBlock('math', node.attrs.latex, false)},
    math_block: {atom: true, attrs: {latex: {default: ''}}, group: 'block', toDOM: (node) => renderOptionalBlock('math', node.attrs.latex)},
    mermaid: {atom: true, attrs: {source: {default: ''}}, group: 'block', toDOM: (node) => renderOptionalBlock('mermaid', node.attrs.source)},
    definition_description: {content: 'block+', group: 'block', toDOM: () => ['dd', 0]},
    definition_list: {content: 'definition_term definition_description+', group: 'block', toDOM: () => ['dl', 0]},
    definition_term: {content: 'inline*', toDOM: () => ['dt', 0]},
    quote_link: {
        attrs: {cite: {default: ''}, content: {default: ''}},
        content: 'block+',
        defining: true,
        group: 'block',
        toDOM: (node) => ['blockquote', {cite: node.attrs.cite, 'data-content': node.attrs.content, 'data-quote-link': ''}, 0],
    },
    directive: {
        atom: true,
        attrs: {content: {default: ''}, name: {default: 'note'}},
        group: 'block',
        toDOM: (node) => node.attrs.name === 'html'
            ? renderHtmlBlock(node.attrs.content, 'data-directive-html')
            : ['div', {'data-directive': node.attrs.name}, node.attrs.content],
    },
    raw_html: {
        atom: true,
        attrs: {html: {default: ''}},
        group: 'block',
        toDOM: (node) => renderHtmlBlock(node.attrs.html, 'data-raw-html'),
    },
    yfm_html_block: {atom: true, attrs: {html: {default: ''}}, group: 'block', toDOM: (node) => renderYfmHtml(node.attrs.html)},
};

/** Schema for the first WYSIWYG milestone. YFM-specific nodes are added later. */
export const basicMarkdownSchema: Schema = new Schema({
    marks: defaultMarkdownSchema.spec.marks.append(basicMarks),
    nodes: defaultMarkdownSchema.spec.nodes
        .update('heading', {
            attrs: {class: {default: null}, folding: {default: null}, id: {default: null}, level: {default: 1}},
            content: 'inline*',
            group: 'block',
            defining: true,
            toDOM: (node) => [`h${node.attrs.level}`, {class: node.attrs.class, id: node.attrs.id}, 0],
        })
        .append({...markdownTableNodes, ...extendedMarkdownNodes}),
});

const tableTokenSpecs: Record<string, ParseSpec> = {
    dd: {block: 'definition_description'},
    dl: {block: 'definition_list'},
    dt: {block: 'definition_term'},
    directive: {node: 'directive', getAttrs: (token) => ({content: token.content, name: token.info})},
    heading: {block: 'heading', getAttrs: (token) => ({
        class: token.attrGet('class'),
        folding: token.attrGet('folding') === null ? null : token.attrGet('folding') === 'true',
        id: token.attrGet('id'),
        level: Number(token.tag.slice(1)),
    })},
    html_block: {node: 'raw_html', getAttrs: (token) => ({html: token.content})},
    inline_math: {node: 'inline_math', getAttrs: (token) => ({latex: token.content})},
    math_block: {node: 'math_block', getAttrs: (token) => ({latex: token.content})},
    mermaid: {node: 'mermaid', getAttrs: (token) => ({source: token.content})},
    quote_link: {block: 'quote_link', getAttrs: (token) => ({cite: token.attrGet('cite'), content: token.attrGet('data-content')})},
    table: {block: 'table'},
    tbody: {ignore: true},
    td: {block: 'table_cell'},
    th: {block: 'table_header'},
    thead: {ignore: true},
    tr: {block: 'table_row'},
    yfm_html_block: {node: 'yfm_html_block', getAttrs: (token) => ({html: token.content})},
};

function createExtendedMarkdownIt(): MarkdownIt {
    const markdown = new MarkdownIt('commonmark', {html: true}).enable('table').use(deflist);
    markdown.inline.ruler.after('escape', 'inline_math', (state, silent) => {
        if (state.src.charCodeAt(state.pos) !== 0x24) return false;
        const close = state.src.indexOf('$', state.pos + 1);
        if (close <= state.pos + 1 || state.src.charCodeAt(state.pos + 1) === 0x24) return false;
        if (!silent) {
            const token = state.push('inline_math', '', 0);
            token.content = state.src.slice(state.pos + 1, close);
        }
        state.pos = close + 1;
        return true;
    });
    markdown.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
        if (state.getLines(startLine, startLine + 1, 0, false).trim() !== '$$') return false;
        let line = startLine + 1;
        while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== '$$') line += 1;
        if (line === endLine) return false;
        if (!silent) {
            const token = state.push('math_block', '', 0);
            token.content = state.getLines(startLine + 1, line, 0, false).trim();
        }
        state.line = line + 1;
        return true;
    });
    markdown.core.ruler.after('block', 'advanced_fences', (state) => {
        for (const token of state.tokens) {
            if (token.type === 'fence' && token.info.trim() === 'mermaid') token.type = 'mermaid';
        }
    });
    markdown.core.ruler.after('block', 'folding_heading', (state) => {
        for (const [index, token] of state.tokens.entries()) {
            const inline = state.tokens[index + 1];
            const close = state.tokens[index + 2];
            if (token?.type !== 'paragraph_open' || inline?.type !== 'inline' || close?.type !== 'paragraph_close') continue;
            const match = inline.content.match(/^(#{1,6})\+\s+(.+)$/);
            if (match === null) continue;
            const level = match[1]?.length ?? 1;
            token.type = 'heading_open';
            token.tag = `h${level}`;
            token.attrSet('folding', 'false');
            inline.content = match[2] ?? '';
            close.type = 'heading_close';
            close.tag = `h${level}`;
        }
    });
    markdown.core.ruler.after('block', 'heading_attributes', (state) => {
        for (const [index, token] of state.tokens.entries()) {
            const inline = state.tokens[index + 1];
            if (token?.type !== 'heading_open' || inline?.type !== 'inline') continue;
            if (inline.content.startsWith('+ ')) {
                inline.content = inline.content.slice(2);
                token.attrSet('folding', 'false');
            }
            const match = inline.content.match(/\s+\{([^}]+)\}$/);
            if (match === null) continue;
            inline.content = inline.content.slice(0, match.index);
            for (const attribute of match[1]?.split(/\s+/) ?? []) {
                if (attribute.startsWith('#')) token.attrSet('id', attribute.slice(1));
                if (attribute.startsWith('.')) token.attrSet('class', attribute.slice(1));
            }
        }
    });
    markdown.core.ruler.after('inline', 'quote_link', (state) => {
        let index = 0;
        while (index < state.tokens.length) {
            const token = state.tokens[index];
            const paragraph = state.tokens[index + 1];
            const inline = state.tokens[index + 2];
            const paragraphClose = state.tokens[index + 3];
            if (token?.type !== 'blockquote_open' || paragraph?.type !== 'paragraph_open' || inline?.type !== 'inline' || paragraphClose?.type !== 'paragraph_close') {
                index += 1;
                continue;
            }
            const match = inline.content.match(/^\[([^\]]+)\]\(([^)]+)\)\{data-quotelink=true\}$/);
            if (match === null) {
                index += 1;
                continue;
            }
            const closeIndex = state.tokens.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.type === 'blockquote_close');
            if (closeIndex === -1) {
                index += 1;
                continue;
            }
            token.type = 'quote_link_open';
            token.attrSet('cite', match[2] ?? '');
            token.attrSet('data-content', match[1] ?? '');
            state.tokens[closeIndex]!.type = 'quote_link_close';
            state.tokens.splice(index + 1, 3);
            index += 1;
        }
    });
    markdown.block.ruler.before('fence', 'directive', (state, startLine, endLine, silent) => {
        const start = state.getLines(startLine, startLine + 1, 0, false).trim();
        const yfmHtml = start === ':::html';
        const match = start.match(/^:::\s*(\w+)\s*$/);
        if (match === null) return false;
        let line = startLine + 1;
        while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== ':::') line += 1;
        if (line === endLine) return false;
        if (!silent) {
            const token = state.push(yfmHtml ? 'yfm_html_block' : 'directive', '', 0);
            token.content = state.getLines(startLine + 1, line, 0, false).trim();
            token.info = match[1] ?? 'note';
        }
        state.line = line + 1;
        return true;
    });
    return markdown;
}

const basicMarkdownParser = new MarkdownParser(
    basicMarkdownSchema,
    createExtendedMarkdownIt(),
    {...defaultMarkdownParser.tokens, ...tableTokenSpecs},
);

const basicMarkdownSerializer = new MarkdownSerializer(
    {
        ...defaultMarkdownSerializer.nodes,
        definition_description(state, node) { state.renderContent(node); state.closeBlock(node); },
        definition_list(state, node) { state.renderContent(node); state.closeBlock(node); },
        definition_term(state, node) { state.renderInline(node); state.write('\n: '); },
        directive(state, node) { state.write(`::: ${node.attrs.name}\n${node.attrs.content}\n:::`); state.closeBlock(node); },
        inline_math(state, node) { state.write(`$${node.attrs.latex}$`); },
        math_block(state, node) { state.write(`$$\n${node.attrs.latex}\n$$`); state.closeBlock(node); },
        mermaid(state, node) { state.write(`\`\`\`mermaid\n${node.attrs.source}\n\`\`\``); state.closeBlock(node); },
        heading(state, node) {
            state.write(`${'#'.repeat(node.attrs.level)}${node.attrs.folding === null ? '' : '+'} `);
            state.renderInline(node);
            const attributes = [node.attrs.id === null ? '' : `#${node.attrs.id}`, node.attrs.class === null ? '' : `.${node.attrs.class}`].filter(Boolean).join(' ');
            if (attributes) state.write(` {${attributes}}`);
            state.closeBlock(node);
        },
        raw_html(state, node) { state.write(node.attrs.html); state.closeBlock(node); },
        yfm_html_block(state, node) { state.write(`:::html\n${node.attrs.html}\n:::`); state.closeBlock(node); },
        quote_link(state, node) {
            state.wrapBlock('> ', null, node, () => {
                state.write(`[${node.attrs.content}](${node.attrs.cite}){data-quotelink=true}`);
                state.write('\n\n');
                state.renderContent(node);
            });
        },
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
        color: {
            close: '</span>',
            open: (_state, mark) => `<span style="color: ${mark.attrs.color}">`,
        },
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

function insertFileCommand(href: string, name: string): Command {
    return (state, dispatch) => {
        if (dispatch !== undefined) {
            const link = getMarkType('link').create({href});
            dispatch(state.tr.replaceSelectionWith(state.schema.text(name, [link]), false).scrollIntoView());
        }
        return true;
    };
}

function insertImageCommand(src: string, alt: string): Command {
    return (state, dispatch) => {
        if (dispatch !== undefined) {
            const image = getNodeType('image').create({alt, src, title: null});
            dispatch(state.tr.replaceSelectionWith(image).scrollIntoView());
        }
        return true;
    };
}

function setColorCommand(color: string): Command {
    return (state, dispatch) => {
        const mark = getMarkType('color');
        if (dispatch !== undefined) {
            const {empty, from, to} = state.selection;
            const transaction = empty
                ? state.tr.removeStoredMark(mark).addStoredMark(mark.create({color}))
                : state.tr.removeMark(from, to, mark).addMark(from, to, mark.create({color}));
            dispatch(transaction.scrollIntoView());
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
    insertFile(href: string, name: string): Command;
    insertImage(src: string, alt: string): Command;
    insertTable(rows?: number, columns?: number): Command;
    italic: Command;
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
    toggleHeadingFolding: Command;
    underline: Command;
    undo: Command;
}

export interface BasicWysiwygSelectionState {
    bold: boolean;
    bulletList: boolean;
    code: boolean;
    codeBlock: boolean;
    headingLevel: number | undefined;
    headingFolded: boolean;
    italic: boolean;
    mark: boolean;
    orderedList: boolean;
    quote: boolean;
    strikethrough: boolean;
    underline: boolean;
}

const foldingPluginKey = new PluginKey<DecorationSet>('folding-heading');
const tableControlsPluginKey = new PluginKey<DecorationSet>('table-controls');

function createTableControl(action: 'column' | 'row', position: number): HTMLElement {
    const control = document.createElement('button');
    control.className = `markdown-editor__table-control markdown-editor__table-control--${action}`;
    control.dataset.tableAction = action;
    control.dataset.tablePosition = String(position);
    control.setAttribute('aria-label', action === 'column' ? 'Добавить колонку' : 'Добавить строку');
    control.type = 'button';
    control.textContent = '+';
    control.addEventListener('pointerenter', () => {
        const table = control.closest('table');
        if (table === null) return;
        const bounds = table.getBoundingClientRect();
        control.style.setProperty('--table-control-line-size', `${action === 'column' ? bounds.height : bounds.width}px`);
    });
    return control;
}

function createTableControlsPlugin(): Plugin<DecorationSet> {
    return new Plugin({
        key: tableControlsPluginKey,
        props: {
            decorations: (state) => {
                const table = findTable(state.selection.$from);
                if (table === null) return DecorationSet.empty;
                const map = TableMap.get(table.node);
                const decorations: Decoration[] = [];
                for (const column of Array.from({length: map.width}, (_value, index) => index)) {
                    const position = table.start + map.map[column]!;
                    decorations.push(Decoration.widget(position + 1, () => createTableControl('column', position), {side: -1}));
                }
                for (const row of Array.from({length: map.height}, (_value, index) => index)) {
                    const position = table.start + map.map[row * map.width]!;
                    decorations.push(Decoration.widget(position + 1, () => createTableControl('row', position), {side: -1}));
                }
                return DecorationSet.create(state.doc, decorations);
            },
            handleDOMEvents: {
                mousedown: (view, event) => {
                    const target = event.target;
                    if (!(target instanceof HTMLElement)) return false;
                    const control = target.closest<HTMLElement>('[data-table-action][data-table-position]');
                    if (control === null) return false;
                    const position = Number(control.dataset.tablePosition);
                    event.preventDefault();
                    view.dispatch(view.state.tr.setSelection(CellSelection.create(view.state.doc, position)));
                    (control.dataset.tableAction === 'column' ? addColumnAfter : addRowAfter)(view.state, view.dispatch);
                    return true;
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
            if (node.type.name === 'heading') {
                const level = Number(node.attrs.level);
                if (foldedLevel !== undefined && level <= foldedLevel) {
                    foldedLevel = undefined;
                }
                if (node.attrs.folding === true) {
                    foldedLevel = level;
                }
            } else if (foldedLevel !== undefined) {
                decorations.push(Decoration.node(offset, offset + node.nodeSize, {
                    class: 'markdown-editor__folded-content',
                }));
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
            apply: (transaction, previous) => transaction.docChanged
                ? createDecorations(transaction.doc)
                : previous.map(transaction.mapping, transaction.doc),
            init: (_config, state) => createDecorations(state.doc),
        },
    });
}

const toggleHeadingFolding: Command = (state, dispatch) => {
    const {$from} = state.selection;
    if ($from.parent.type.name !== 'heading') {
        return false;
    }
    if (dispatch !== undefined) {
        dispatch(state.tr.setNodeMarkup($from.before(), undefined, {
            ...$from.parent.attrs,
            folding: !$from.parent.attrs.folding,
        }));
    }
    return true;
};

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
        insertFile: insertFileCommand,
        insertImage: insertImageCommand,
        insertTable: createTableCommand,
        italic: toggleMark(getMarkType('em')),
        link: (href) => toggleMark(getMarkType('link'), {href}),
        mark: toggleMark(getMarkType('mark')),
        orderedList: wrapInList(getNodeType('ordered_list')),
        paragraph: setBlockType(getNodeType('paragraph')),
        quote: wrapIn(getNodeType('blockquote')),
        redo,
        setColor: setColorCommand,
        sinkListItem: sinkListItem(listItem),
        splitListItem: splitListItem(listItem),
        strikethrough: toggleMark(getMarkType('strikethrough')),
        toggleHeadingFolding,
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
        headingFolded: $from.parent.type.name === 'heading' && $from.parent.attrs.folding === true,
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
    onFiles?(files: readonly File[]): void;
    onSelectionChange?(selection: BasicWysiwygSelectionState): void;
    placeholder?: string;
    plugins?: readonly Plugin[];
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
    onFiles,
    onSelectionChange,
    placeholder = '',
    plugins = [],
    target,
}: MountBasicWysiwygEditorOptions): BasicWysiwygEditor {
    const commands = createBasicEditorCommands();
    let view: EditorView;
    view = new EditorView(target, {
        attributes: {'data-placeholder': placeholder},
        handleDOMEvents: {
            drop: (_view, event) => {
                const files = Array.from(event.dataTransfer?.files ?? []);
                if (files.length === 0 || onFiles === undefined) {
                    return false;
                }
                event.preventDefault();
                onFiles(files);
                return true;
            },
            paste: (_view, event) => {
                const files = Array.from(event.clipboardData?.files ?? []);
                if (files.length === 0 || onFiles === undefined) {
                    return false;
                }
                event.preventDefault();
                onFiles(files);
                return true;
            },
        },
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
                createFoldingPlugin(),
                createTableControlsPlugin(),
                history(),
                keymap({
                    'Mod-Shift-z': commands.redo,
                    'Mod-b': commands.bold,
                    'Mod-i': commands.italic,
                    'Mod-z': commands.undo,
                }),
                keymap(baseKeymap),
                tableEditing(),
                ...plugins,
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
                    createFoldingPlugin(),
                    createTableControlsPlugin(),
                        history(),
                        keymap({
                            'Mod-Shift-z': commands.redo,
                            'Mod-b': commands.bold,
                            'Mod-i': commands.italic,
                            'Mod-z': commands.undo,
                        }),
                        keymap(baseKeymap),
                        tableEditing(),
                        ...plugins,
                    ],
                }),
            );
            onSelectionChange?.(getBasicWysiwygSelectionState(view.state));
        },
    };
}
