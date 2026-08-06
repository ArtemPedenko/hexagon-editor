import {defaultKeymap, history, historyKeymap, indentWithTab, redo, undo} from '@codemirror/commands';
import {markdown, markdownLanguage} from '@codemirror/lang-markdown';
import {bracketMatching, defaultHighlightStyle, syntaxHighlighting} from '@codemirror/language';
import {EditorState} from '@codemirror/state';
import {highlightSelectionMatches, openSearchPanel, searchKeymap} from '@codemirror/search';
import {EditorView, keymap, lineNumbers} from '@codemirror/view';

export interface BasicMarkupEditor {
    destroy(): void;
    focus(): void;
    getValue(): string;
    openSearch(): void;
    redo(): void;
    setValue(value: string): void;
    undo(): void;
}

export interface MountBasicMarkupEditorOptions {
    initialValue?: string;
    onChange?(value: string): void;
    target: HTMLElement;
}

/** CodeMirror 6 Markdown host used by the Vue editor modes in the next milestone. */
export function mountBasicMarkupEditor({
    initialValue = '',
    onChange,
    target,
}: MountBasicMarkupEditorOptions): BasicMarkupEditor {
    const view = new EditorView({
        parent: target,
        state: EditorState.create({
            doc: initialValue,
            extensions: [
                lineNumbers(),
                history(),
                bracketMatching(),
                highlightSelectionMatches(),
                markdown({base: markdownLanguage}),
                syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
                keymap.of([
                    indentWithTab,
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...searchKeymap,
                ]),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange?.(update.state.doc.toString());
                    }
                }),
            ],
        }),
    });

    return {
        destroy: () => view.destroy(),
        focus: () => view.focus(),
        getValue: () => view.state.doc.toString(),
        openSearch: () => openSearchPanel(view),
        redo: () => {
            redo(view);
        },
        setValue: (value) => {
            if (value !== view.state.doc.toString()) {
                view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: value}});
            }
        },
        undo: () => {
            undo(view);
        },
    };
}
