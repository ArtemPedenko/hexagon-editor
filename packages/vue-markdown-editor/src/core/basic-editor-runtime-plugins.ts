import type {Schema} from 'prosemirror-model';
import {Plugin} from 'prosemirror-state';

import {FullPreset} from '../presets/full';
import type {SelectionContextOptions} from '../extensions/behavior/selection-context';
import {TableNode} from '../extensions/markdown/table';

import {ExtensionsManager} from './extensions-manager';
import type {MarkdownCodec} from './markdown';

export function createBasicDefaultPresetPlugins(schema: Schema, placeholder: string, selectionContext: SelectionContextOptions | undefined, onCancel?: () => boolean, onSubmit?: () => boolean): Plugin[] {
    return ExtensionsManager.plugins((builder) => builder.use(FullPreset, {bold: {boldKey: 'Mod-b'}, editorModeKeymap: {ignoreKeysList: ['Tab', 'Shift-Tab'], onCancel, onSubmit}, italic: {italicKey: 'Mod-i'}, placeholder: {content: placeholder}, selectionContext}), schema);
}

export function createMarkdownTablePastePlugin(codec: MarkdownCodec): Plugin {
    return new Plugin({props: {handleDOMEvents: {paste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const trimmed = text.trim();
        if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
        const document = codec.parse(text);
        const table = document.childCount === 1 && document.firstChild?.type.name === TableNode.Table ? document.firstChild : undefined;
        if (table === undefined) return false;
        event.preventDefault();
        view.dispatch(view.state.tr.replaceSelectionWith(table).scrollIntoView());
        return true;
    }}}});
}
