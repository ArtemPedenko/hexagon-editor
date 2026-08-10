import {setBlockType} from 'prosemirror-commands';
import {InputRule, textblockTypeInputRule} from 'prosemirror-inputrules';
import type MarkdownIt from 'markdown-it';
import {Fragment} from 'prosemirror-model';
import type {NodeSpec, NodeType} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';
import {NodeSelection, Plugin, TextSelection} from 'prosemirror-state';
import type {Command, EditorState} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

export enum MathNode {
    Inline = 'inline_math',
    Block = 'math_block',
}

export const defaultMathLatex = 'E = mc^2';
export const mathInlineActionName = 'addMathInline';
export const mathBlockActionName = 'toMathBlock';
const vscodeEditorDataType = 'vscode-editor-data';
const latexModes = new Set(['tex', 'latex', 'bibtex', 'doctex', 'latex-expl3', 'pweave', 'jlweave', 'rsweave']);

/** Local math tokenizer kept intentionally independent from @diplodoc/latex-extension. */
export function configureMathMarkdown(markdown: MarkdownIt): MarkdownIt {
    markdown.inline.ruler.after('backticks', 'inline_math', (state, silent) => {
        if (state.src.charCodeAt(state.pos) !== 0x24) return false;
        if (state.src.charCodeAt(state.pos + 1) === 0x24 || isEscaped(state.src, state.pos)) return false;
        let close = state.pos + 1;
        while (close < state.posMax) {
            close = state.src.indexOf('$', close);
            if (close < 0 || close >= state.posMax) return false;
            if (!isEscaped(state.src, close)) break;
            close += 1;
        }
        if (close <= state.pos + 1 || /\s/.test(state.src[state.pos + 1] ?? '') || /\s/.test(state.src[close - 1] ?? '')) return false;
        if (!silent) {
            const token = state.push(MathNode.Inline, '', 0);
            token.content = state.src.slice(state.pos + 1, close);
        }
        state.pos = close + 1;
        return true;
    });
    markdown.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
        const opening = state.getLines(startLine, startLine + 1, 0, false).trim();
        if (!opening.startsWith('$$')) return false;
        const sameLine = opening.match(/^\$\$\s*(.*?)\s*\$\$$/);
        if (sameLine !== null) {
            if (!silent) {
                const token = state.push(MathNode.Block, '', 0);
                token.content = sameLine[1] ?? '';
            }
            state.line = startLine + 1;
            return true;
        }
        if (opening !== '$$') return false;
        let line = startLine + 1;
        while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== '$$') line += 1;
        if (line === endLine) return false;
        if (!silent) {
            const token = state.push(MathNode.Block, '', 0);
            token.content = state.getLines(startLine + 1, line, 0, false).trim();
        }
        state.line = line + 1;
        return true;
    });
    return markdown;
}

export const mathNodeSpecs: Record<MathNode, NodeSpec> = {
    [MathNode.Inline]: {atom: true, attrs: {latex: {default: ''}}, group: 'inline', inline: true, toDOM: (node) => ['span', {'data-math-inline': ''}, node.attrs.latex]},
    [MathNode.Block]: {atom: true, attrs: {latex: {default: ''}}, group: 'block', toDOM: (node) => ['pre', {'data-math-block': ''}, node.attrs.latex]},
};

export function createMathNodeSpecs(render: (latex: string, display: boolean) => HTMLElement): Record<MathNode, NodeSpec> {
    return {
        [MathNode.Inline]: {...mathNodeSpecs[MathNode.Inline], toDOM: (node) => render(node.attrs.latex, false)},
        [MathNode.Block]: {...mathNodeSpecs[MathNode.Block], toDOM: (node) => render(node.attrs.latex, true)},
    };
}

export const mathTokenSpecs: Record<MathNode, ParseSpec> = {
    [MathNode.Inline]: {getAttrs: (token) => ({latex: token.content}), node: MathNode.Inline},
    [MathNode.Block]: {getAttrs: (token) => ({latex: token.content}), node: MathNode.Block},
};

export const mathSerializerNodes: Record<MathNode, Parameters<typeof MarkdownSerializer>[0][string]> = {
    [MathNode.Inline]: (state, node) => state.write(`$${node.attrs.latex}$`),
    [MathNode.Block]: (state, node) => { state.write(`$$\n${node.attrs.latex}\n$$`); state.closeBlock(node); },
};

export function getMathNodeType(schema: EditorState['schema'], node: MathNode): NodeType {
    const type = schema.nodes[node];
    if (type === undefined) throw new Error(`Math extension requires a ${node} node`);
    return type;
}

export function isLatexMode(mode: string | undefined): boolean {
    return mode !== undefined && latexModes.has(mode.toLowerCase());
}

export function parseLatexFormulas(content: string): string[] {
    return content
        .split(/\n\s*\n/)
        .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean).join('\n'))
        .filter(Boolean);
}

export function createLatexPastePlugin(): Plugin {
    return new Plugin({
        props: {
            handleDOMEvents: {
                paste: (view, event) => {
                    const data = event.clipboardData;
                    if (data === null || data === undefined || view.state.selection.$from.parent.type.spec.code === true) return false;
                    const latex = getVSCodeLatex(data);
                    const type = view.state.schema.nodes[MathNode.Block];
                    if (latex === undefined || type === undefined) return false;
                    const nodes = parseLatexFormulas(latex).map((formula) => type.create({latex: formula}));
                    view.dispatch(view.state.tr.replaceWith(view.state.selection.from, view.state.selection.to, Fragment.from(nodes)).scrollIntoView());
                    event.preventDefault();
                    return true;
                },
            },
        },
    });
}

export function createMathInlineInputRule(type: NodeType): InputRule {
    return new InputRule(/\$([^$\s](?:[^$\n]*[^$\s])?)\$$/, (state, match, start, end) => {
        const latex = match[1];
        if (latex === undefined || isInCode(state, start, end)) return null;
        return state.tr.replaceWith(start, end, type.create({latex}));
    });
}

export const insertInlineMath: Command = (state, dispatch) => {
    const type = state.schema.nodes[MathNode.Inline];
    if (type === undefined) return false;
    const {from, to} = state.selection;
    const selectedText = state.doc.textBetween(from, to) || defaultMathLatex;
    const transaction = state.tr.replaceSelectionWith(type.create({latex: selectedText}));
    dispatch?.(transaction.setSelection(TextSelection.create(transaction.doc, from + 1)).scrollIntoView());
    return true;
};

export const insertMathBlock: Command = (state, dispatch) => {
    const {$from, empty} = state.selection;
    if (!empty || !$from.parent.isTextblock || $from.parent.content.size !== 0) return false;
    const type = state.schema.nodes[MathNode.Block];
    if (type === undefined) return false;
    dispatch?.(state.tr.replaceWith($from.before(), $from.after(), type.create({latex: defaultMathLatex})).scrollIntoView());
    return true;
};

export const toMathBlock: Command = (state, dispatch) => {
    const type = state.schema.nodes[MathNode.Block];
    return type === undefined ? false : setBlockType(type, {latex: defaultMathLatex})(state, dispatch);
};

export const moveCursorLeftOfMathInline: Command = (state, dispatch) => {
    const {$from} = state.selection;
    if (!$from.parent.isTextblock || $from.parentOffset === 0 || $from.nodeBefore?.type !== state.schema.nodes[MathNode.Inline]) return false;
    dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, $from.pos - $from.nodeBefore.nodeSize)));
    return true;
};

export const moveCursorRightOfMathInline: Command = (state, dispatch) => {
    const {$from} = state.selection;
    if (!$from.parent.isTextblock || $from.nodeAfter?.type !== state.schema.nodes[MathNode.Inline]) return false;
    dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, $from.pos + $from.nodeAfter.nodeSize)));
    return true;
};

export const selectMathInlineBeforeCursor: Command = (state, dispatch) => {
    const {$from} = state.selection;
    if (!$from.parent.isTextblock || $from.nodeBefore?.type !== state.schema.nodes[MathNode.Inline]) return false;
    dispatch?.(state.tr.setSelection(NodeSelection.create(state.doc, $from.pos - $from.nodeBefore.nodeSize)));
    return true;
};

function isInCode(state: EditorState, from: number, to: number): boolean {
    const code = state.schema.marks.code;
    return code !== undefined && (state.doc.rangeHasMark(from, to, code) || state.selection.$from.marks().some((mark) => mark.type === code));
}

function isEscaped(source: string, position: number): boolean {
    let slashes = 0;
    for (let index = position - 1; index >= 0 && source[index] === '\\'; index -= 1) slashes += 1;
    return slashes % 2 === 1;
}

function getVSCodeLatex(data: DataTransfer): string | undefined {
    if (!data.types.includes(vscodeEditorDataType)) return undefined;
    try {
        const metadata: unknown = JSON.parse(data.getData(vscodeEditorDataType));
        if (typeof metadata !== 'object' || metadata === null || !('mode' in metadata) || typeof metadata.mode !== 'string' || !isLatexMode(metadata.mode)) return undefined;
        return data.getData('text/plain');
    } catch {
        return undefined;
    }
}

export const Math: ExtensionAuto = (builder) => {
    builder.configureMd(configureMathMarkdown);
    for (const node of Object.values(MathNode)) {
        builder.addNodeSpec(node, () => mathNodeSpecs[node]).addMarkdownTokenParserSpec(node, () => mathTokenSpecs[node]).addNodeSerializerSpec(node, () => mathSerializerNodes[node]);
    }
    builder
        .addInputRules(({schema}) => ({
            rules: [
                textblockTypeInputRule(/^\$\$\s$/, getMathNodeType(schema, MathNode.Block)),
                createMathInlineInputRule(getMathNodeType(schema, MathNode.Inline)),
            ],
        }))
        .addKeymap(() => ({
            ArrowLeft: moveCursorLeftOfMathInline,
            ArrowRight: moveCursorRightOfMathInline,
            Backspace: selectMathInlineBeforeCursor,
        }))
        .addPlugin(createLatexPastePlugin, builder.Priority.VeryHigh);
};
