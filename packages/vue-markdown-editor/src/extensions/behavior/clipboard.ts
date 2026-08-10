import {Fragment} from 'prosemirror-model';
import {Plugin} from 'prosemirror-state';
import type {EditorState} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

export function isInsideCode(state: EditorState): boolean {
    if (state.selection.$from.parent.type.spec.code) return true;
    const marks = state.selection.empty
        ? state.storedMarks ?? state.selection.$from.marks()
        : state.selection.$from.marks();
    return marks.some((mark) => mark.type.spec.code);
}

/** Independent upstream Clipboard slice: paste plain text into inline or block code. */
export const Clipboard: ExtensionAuto = (builder) => {
    builder.addPlugin(() => new Plugin({
        props: {
            handleDOMEvents: {
                paste(view, event) {
                    if (!isInsideCode(view.state) || event.clipboardData === null) return false;
                    const files = Array.from(event.clipboardData.files);
                    const rawText = files.length > 0
                        ? files.map((file) => file.name).join(' ')
                        : event.clipboardData.getData('text/plain');
                    const text = view.state.selection.$from.parent.type.spec.code
                        ? rawText
                        : rawText.replaceAll('\n', '↵');
                    event.preventDefault();
                    const transaction = text.length > 0
                        ? view.state.tr.replaceSelectionWith(view.state.schema.text(text), true)
                        : view.state.tr.replaceWith(view.state.selection.from, view.state.selection.to, Fragment.empty);
                    view.dispatch(transaction.scrollIntoView());
                    return true;
                },
            },
        },
    }), builder.Priority.Highest);
};
