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
import {Italic} from '../extensions/markdown/italic';
import type {ItalicOptions} from '../extensions/markdown/italic';
import {Code} from '../extensions/markdown/code';
import type {CodeOptions} from '../extensions/markdown/code';
import {CodeBlock} from '../extensions/markdown/code-block';
import type {CodeBlockOptions} from '../extensions/markdown/code-block';
import {Heading} from '../extensions/markdown/heading';
import type {HeadingOptions} from '../extensions/markdown/heading';
import {HorizontalRule} from '../extensions/markdown/horizontal-rule';
import {Link} from '../extensions/markdown/link';
import type {LinkOptions} from '../extensions/markdown/link';
import {Breaks} from '../extensions/markdown/breaks';
import type {BreaksOptions} from '../extensions/markdown/breaks';
import {Deflist} from '../extensions/markdown/deflist';
import {Html} from '../extensions/markdown/html';
import {Image} from '../extensions/markdown/image';
import {Mark} from '../extensions/markdown/mark';
import {Strike} from '../extensions/markdown/strike';
import {Subscript} from '../extensions/markdown/subscript';
import {Underline} from '../extensions/markdown/underline';

import {ZeroPreset} from './zero';

export interface DefaultPresetOptions {
    baseSchema?: BaseSchemaOptions;
    blockquote?: BlockquoteOptions;
    breaks?: BreaksOptions;
    bold?: BoldOptions;
    code?: CodeOptions;
    codeBlock?: CodeBlockOptions;
    heading?: HeadingOptions;
    link?: LinkOptions;
    italic?: ItalicOptions;
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
        .use(Italic, options?.italic ?? {})
        .use(Code, options?.code ?? {})
        .use(CodeBlock, options?.codeBlock ?? {})
        .use(Heading, options?.heading ?? {})
        .use(HorizontalRule)
        .use(Link, options?.link ?? {})
        .use(Breaks, options?.breaks ?? {})
        .use(Deflist)
        .use(Html)
        .use(Image)
        .use(Mark)
        .use(Strike)
        .use(Subscript)
        .use(Underline)
        .use(Lists, options?.lists ?? {})
        .use(History, options?.history ?? {})
        .use(Placeholder, options?.placeholder ?? {})
        .use(FilePaste, options?.filePaste ?? {})
        .use(Clipboard)
        .use(Selection)
        .use(SelectionContext, options?.selectionContext ?? {});
};
