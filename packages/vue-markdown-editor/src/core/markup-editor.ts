import {defaultKeymap, history, historyKeymap, indentWithTab, redo, undo} from '@codemirror/commands';
import {markdown, markdownLanguage} from '@codemirror/lang-markdown';
import {bracketMatching, defaultHighlightStyle, syntaxHighlighting} from '@codemirror/language';
import {EditorState} from '@codemirror/state';
import {EditorView, keymap, lineNumbers} from '@codemirror/view';

export interface BasicMarkupEditor {
    destroy(): void;
    focus(): void;
    getValue(): string;
    hasFocus(): boolean;
    insert(markup: string): void;
    moveCursor(position: 'start' | 'end' | {line: number}): void;
    redo(): void;
    setValue(value: string): void;
    undo(): void;
}

export interface MountBasicMarkupEditorOptions {
    editable?: boolean;
    initialValue?: string;
    onChange?(value: string): void;
    target: HTMLElement;
}

/** CodeMirror 6 Markdown host used by the Vue editor modes in the next milestone. */
export function mountBasicMarkupEditor({
    editable = true,
    initialValue = '',
    onChange,
    target,
}: MountBasicMarkupEditorOptions): BasicMarkupEditor {
    let destroyed = false;
    let syncingExternalValue = false;
    const view = new EditorView({
        parent: target,
        state: EditorState.create({
            doc: initialValue,
            extensions: [
                EditorView.editable.of(editable),
                lineNumbers(),
                history(),
                bracketMatching(),
                markdown({base: markdownLanguage}),
                syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
                keymap.of([
                    indentWithTab,
                    ...defaultKeymap,
                    ...historyKeymap,
                ]),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged && !syncingExternalValue) {
                        onChange?.(update.state.doc.toString());
                    }
                }),
            ],
        }),
    });

    return {
        destroy: () => {
            if (destroyed) {
                return;
            }

            destroyed = true;
            view.destroy();
        },
        focus: () => {
            if (!destroyed) {
                view.focus();
            }
        },
        getValue: () => view.state.doc.toString(),
        hasFocus: () => view.hasFocus,
        insert: (markup) => {
            if (destroyed) return;
            view.dispatch({changes: {from: view.state.selection.main.from, to: view.state.selection.main.to, insert: markup}});
        },
        moveCursor: (position) => {
            if (destroyed) return;
            const anchor = typeof position === 'object'
                ? view.state.doc.line(Math.min(Math.max(position.line + 1, 1), view.state.doc.lines)).from
                : position === 'start' ? 0 : view.state.doc.length;
            view.dispatch({selection: {anchor}, scrollIntoView: true});
            view.focus();
        },
        redo: () => {
            if (!destroyed) {
                redo(view);
            }
        },
        setValue: (value) => {
            if (!destroyed && value !== view.state.doc.toString()) {
                syncingExternalValue = true;
                view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: value}});
                syncingExternalValue = false;
            }
        },
        undo: () => {
            if (!destroyed) {
                undo(view);
            }
        },
    };
}
