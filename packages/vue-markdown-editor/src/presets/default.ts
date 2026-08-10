import type {ExtensionAuto} from '../core/extension-builder';
import type {BaseSchemaOptions} from '../extensions/base';
import {History} from '../extensions/behavior/history';
import type {HistoryOptions} from '../extensions/behavior/history';
import {FilePaste} from '../extensions/behavior/file-paste';
import type {FilePasteOptions} from '../extensions/behavior/file-paste';
import {Clipboard} from '../extensions/behavior/clipboard';
import {Placeholder} from '../extensions/behavior/placeholder';
import type {PlaceholderOptions} from '../extensions/behavior/placeholder';
import {Selection} from '../extensions/behavior/selection';
import {SelectionContext} from '../extensions/behavior/selection-context';
import type {SelectionContextOptions} from '../extensions/behavior/selection-context';
import {Lists} from '../extensions/markdown/lists';
import type {ListsOptions} from '../extensions/markdown/lists';
import {Blockquote} from '../extensions/markdown/blockquote';
import type {BlockquoteOptions} from '../extensions/markdown/blockquote';
import {Bold} from '../extensions/markdown/bold';
import type {BoldOptions} from '../extensions/markdown/bold';

import {ZeroPreset} from './zero';

export interface DefaultPresetOptions {
    baseSchema?: BaseSchemaOptions;
    blockquote?: BlockquoteOptions;
    bold?: BoldOptions;
    filePaste?: FilePasteOptions;
    history?: HistoryOptions;
    lists?: ListsOptions;
    placeholder?: PlaceholderOptions;
    selectionContext?: SelectionContextOptions;
}

/** First composable editor preset: zero foundation plus the fully ported Lists behavior. */
export const DefaultPreset: ExtensionAuto<DefaultPresetOptions> = (builder, options) => {
    builder
        .use(ZeroPreset, {baseSchema: options?.baseSchema})
        .use(Blockquote, options?.blockquote ?? {})
        .use(Bold, options?.bold ?? {})
        .use(Lists, options?.lists ?? {})
        .use(History, options?.history ?? {})
        .use(Placeholder, options?.placeholder ?? {})
        .use(FilePaste, options?.filePaste ?? {})
        .use(Clipboard)
        .use(Selection)
        .use(SelectionContext, options?.selectionContext ?? {});
};
