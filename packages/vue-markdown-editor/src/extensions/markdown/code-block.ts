import {newlineInCode, setBlockType} from 'prosemirror-commands';
import {Plugin} from 'prosemirror-state';
import {NodeSelection} from 'prosemirror-state';
import type {Command, EditorState} from 'prosemirror-state';
import {Decoration, DecorationSet} from 'prosemirror-view';

import type {ExtensionAuto} from '../../core/extension-builder';

import {CodeBlockAttrs, codeBlockNodeName, CodeBlockSpecs} from './code-block-specs';

export {CodeBlockAttrs, CodeBlockSpecs, codeBlockNodeName, codeBlockNodeSpec, codeBlockTokenSpecs, serializeCodeBlock} from './code-block-specs';
export {newlineInCode};

export interface CodeBlockOptions {
    codeBlockKey?: string | null;
}

export function getCodeBlockType(schema: EditorState['schema']) {
    const codeBlock = schema.nodes[codeBlockNodeName];
    if (codeBlock === undefined) throw new Error('CodeBlock extension requires a code_block node');
    return codeBlock;
}

export const setCodeBlock: Command = (state, dispatch, view) => setBlockType(getCodeBlockType(state.schema))(state, dispatch, view);

export const setCodeBlockLanguage =
    (language: string): Command =>
    (state, dispatch) => {
        const selectedNode = state.selection instanceof NodeSelection && state.selection.node.type === getCodeBlockType(state.schema)
            ? {attrs: state.selection.node.attrs, position: state.selection.from}
            : state.selection.$from.parent.type === getCodeBlockType(state.schema)
                ? {attrs: state.selection.$from.parent.attrs, position: state.selection.$from.before()}
                : undefined;
        if (selectedNode === undefined) return false;
        dispatch?.(state.tr.setNodeMarkup(selectedNode.position, undefined, {
            ...selectedNode.attrs,
            [CodeBlockAttrs.Lang]: language,
        }));
        return true;
    };

export const resetCodeBlock: Command = (state, dispatch, view) => {
    if (!state.selection.empty || state.selection.$from.parent.type !== getCodeBlockType(state.schema)) return false;
    return view?.endOfTextblock('backward', state) === true
        ? setBlockType(state.schema.nodes.paragraph!)(state, dispatch, view)
        : false;
};

export const CodeBlock: ExtensionAuto<CodeBlockOptions> = (builder, options) => {
    builder.use(CodeBlockSpecs).addPlugin(() => createCodeBlockDisplayPlugin());
    if (options?.codeBlockKey !== null && options?.codeBlockKey !== undefined) {
        builder.addKeymap(({schema}) => ({[options.codeBlockKey!]: setBlockType(getCodeBlockType(schema))}));
    }
};

function createCodeBlockDisplayPlugin(): Plugin {
    return new Plugin({
        props: {
            decorations: (state) => {
                const decorations: Decoration[] = [];
                state.doc.descendants((node, position) => {
                    if (node.type.name !== codeBlockNodeName) return true;
                    const source = node.textContent;
                    const language = node.attrs[CodeBlockAttrs.Lang] as string;
                    const activeLine = getActiveLineRange(state, position, source);
                    let line = 1;
                    decorations.push(createLanguageDecoration(position, language));
                    decorations.push(createLineNumberDecoration(position + 1, line));
                    for (const [offset, character] of source.split('').entries()) {
                        if (character !== '\n') continue;
                        line += 1;
                        decorations.push(createLineNumberDecoration(position + offset + 2, line));
                    }
                    for (const token of getSyntaxTokens(source, language)) {
                        if (activeLine !== undefined && token.from < activeLine.to && token.to > activeLine.from) {
                            continue;
                        }
                        decorations.push(Decoration.inline(position + token.from + 1, position + token.to + 1, {class: `markdown-editor__code-token--${token.kind}`}));
                    }
                    return false;
                });
                return DecorationSet.create(state.doc, decorations);
            },
        },
    });
}

function getActiveLineRange(
    state: EditorState,
    position: number,
    source: string,
): {from: number; to: number} | undefined {
    const {selection} = state;
    if (!selection.empty || selection.$from.parent.type.name !== codeBlockNodeName) return undefined;
    const offset = selection.from - position - 1;
    if (offset < 0 || offset > source.length) return undefined;
    const previousNewline = source.lastIndexOf('\n', Math.max(0, offset - 1));
    const nextNewline = source.indexOf('\n', offset);
    return {
        from: previousNewline + 1,
        to: nextNewline === -1 ? source.length + 1 : nextNewline + 1,
    };
}

function createLanguageDecoration(position: number, language: string): Decoration {
    return Decoration.widget(position + 1, (view) => {
        const select = document.createElement('select');
        select.className = 'markdown-editor__code-language';
        select.contentEditable = 'false';
        select.setAttribute('aria-label', 'Code language');
        for (const [value, label] of [['', 'Text'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['json', 'JSON'], ['html', 'HTML'], ['css', 'CSS']]) {
            select.add(new Option(label, value));
        }
        select.value = language;
        select.addEventListener('change', () => {
            const node = view.state.doc.nodeAt(position);
            if (node?.type.name !== codeBlockNodeName) return;
            view.dispatch(view.state.tr.setNodeMarkup(position, undefined, {
                ...node.attrs,
                [CodeBlockAttrs.Lang]: select.value,
            }));
            view.focus();
        });
        return select;
    }, {key: `code-language-${position}-${language}`, side: -2, stopEvent: () => true});
}

function createLineNumberDecoration(position: number, line: number): Decoration {
    return Decoration.widget(position, () => createLineNumber(line), {side: -1});
}

function createLineNumber(line: number): HTMLElement {
    const number = document.createElement('span');
    number.className = 'markdown-editor__code-line-number';
    number.contentEditable = 'false';
    number.textContent = String(line);
    return number;
}

function getSyntaxTokens(source: string, language: string): Array<{from: number; kind: 'comment' | 'keyword' | 'number' | 'string' | 'tag'; to: number}> {
    const expression = getSyntaxExpression(language);
    if (expression === undefined) return [];
    const tokens: Array<{from: number; kind: 'comment' | 'keyword' | 'number' | 'string' | 'tag'; to: number}> = [];
    for (const match of source.matchAll(expression)) {
        const value = match[0];
        const from = match.index;
        if (value === undefined || from === undefined) continue;
        tokens.push({from, kind: getSyntaxTokenKind(value), to: from + value.length});
    }
    return tokens;
}

function getSyntaxExpression(language: string): RegExp | undefined {
    if (['js', 'javascript', 'ts', 'typescript'].includes(language)) return /\/\/.*$|\/\*[\s\S]*?\*\/|(['"`])(?:\\.|(?!\1)[^\\])*\1|\b(?:async|await|class|const|export|function|if|import|let|new|return|throw|type|interface|var)\b|\b\d+(?:\.\d+)?\b/gm;
    if (language === 'json') return /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|\b\d+(?:\.\d+)?\b/g;
    if (['html', 'xml', 'vue'].includes(language)) return /<!--[\s\S]*?-->|<\/?[\w-]+(?:\s[^<>]*)?>|(['"])(?:\\.|(?!\1)[^\\])*\1/g;
    if (language === 'css') return /\/\*[\s\S]*?\*\/|(['"])(?:\\.|(?!\1)[^\\])*\1|\b[\w-]+(?=\s*:)|#[\da-fA-F]{3,8}|\b\d+(?:\.\d+)?(?:px|rem|em|%)?/g;
    return undefined;
}

function getSyntaxTokenKind(value: string): 'comment' | 'keyword' | 'number' | 'string' | 'tag' {
    if (value.startsWith('//') || value.startsWith('/*') || value.startsWith('<!--')) return 'comment';
    if (value.startsWith('<')) return 'tag';
    if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) return 'string';
    if (/^\d|^#/.test(value)) return 'number';
    return 'keyword';
}
