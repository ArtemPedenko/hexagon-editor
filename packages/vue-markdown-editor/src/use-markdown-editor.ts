import {getCurrentInstance, onBeforeUnmount, readonly, ref} from 'vue';
import type {Ref} from 'vue';

import {createMarkdownEditor} from './core/editor-instance';
import type {MarkdownEditor} from './core/editor-instance';
import type {MarkdownEditorMode, MarkdownEditorOptions} from './public-types';

export interface UseMarkdownEditorResult {
    destroy(): void;
    editor: MarkdownEditor;
    mode: Readonly<Ref<MarkdownEditorMode>>;
    readonly: Readonly<Ref<boolean>>;
    toolbarVisible: Readonly<Ref<boolean>>;
    value: Readonly<Ref<string>>;
}

/** Vue lifecycle adapter for the headless Markdown editor instance. */
export function useMarkdownEditor(options: MarkdownEditorOptions = {}): UseMarkdownEditorResult {
    const editor = createMarkdownEditor(options);
    const value = ref(editor.getValue());
    const mode = ref(editor.getMode());
    const readonlyState = ref(editor.readonly);
    const toolbarVisible = ref(editor.toolbarVisible);
    const dispose = () => editor.destroy();

    editor.on('change', (nextValue) => {
        value.value = nextValue;
    });
    editor.on('modeChange', (nextMode) => {
        mode.value = nextMode;
    });
    editor.on('changeReadonly', ({readonly: nextReadonly}) => {
        readonlyState.value = nextReadonly;
    });
    editor.on('changeToolbarVisibility', ({visible}) => {
        toolbarVisible.value = visible;
    });

    if (getCurrentInstance() !== null) {
        onBeforeUnmount(dispose);
    }

    return {
        destroy: dispose,
        editor,
        mode: readonly(mode),
        readonly: readonly(readonlyState),
        toolbarVisible: readonly(toolbarVisible),
        value: readonly(value),
    };
}
