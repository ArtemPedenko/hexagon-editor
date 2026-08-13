import type {Extension, ExtensionAuto} from '../core/extension-builder';
import {Blockquote} from '../extensions/markdown/blockquote';
import type {BlockquoteOptions} from '../extensions/markdown/blockquote';
import {Bold} from '../extensions/markdown/bold';
import type {BoldOptions} from '../extensions/markdown/bold';
import {Breaks} from '../extensions/markdown/breaks';
import type {BreaksOptions} from '../extensions/markdown/breaks';
import {Code} from '../extensions/markdown/code';
import type {CodeOptions} from '../extensions/markdown/code';
import {CodeBlock} from '../extensions/markdown/code-block';
import type {CodeBlockOptions} from '../extensions/markdown/code-block';
import {Heading} from '../extensions/markdown/heading';
import type {HeadingOptions} from '../extensions/markdown/heading';
import {HorizontalRule} from '../extensions/markdown/horizontal-rule';
import {Html} from '../extensions/markdown/html';
import {Image} from '../extensions/markdown/image';
import {Italic} from '../extensions/markdown/italic';
import type {ItalicOptions} from '../extensions/markdown/italic';
import {Link} from '../extensions/markdown/link';
import type {LinkOptions} from '../extensions/markdown/link';
import {Lists} from '../extensions/markdown/lists';
import type {ListsOptions} from '../extensions/markdown/lists';

import {ZeroPreset} from './zero';
import type {ZeroPresetOptions} from './zero';

export interface CommonMarkPresetOptions extends ZeroPresetOptions {
    blockquote?: BlockquoteOptions;
    breaks?: BreaksOptions;
    bold?: BoldOptions;
    code?: CodeOptions;
    codeBlock?: CodeBlockOptions;
    heading?: false | Extension | HeadingOptions;
    image?: false | Extension;
    italic?: ItalicOptions;
    link?: LinkOptions;
    lists?: ListsOptions;
}

/** Standard Markdown extensions from the upstream CommonMark preset. */
export const CommonMarkPreset: ExtensionAuto<CommonMarkPresetOptions> = (builder, options) => {
    builder
        .use(ZeroPreset, options)
        .use(Html)
        .use(HorizontalRule)
        .use(Code, options.code ?? {})
        .use(Bold, options.bold ?? {})
        .use(Link, options.link ?? {})
        .use(Lists, options.lists ?? {})
        .use(Italic, options.italic ?? {})
        .use(Breaks, options.breaks ?? {})
        .use(CodeBlock, options.codeBlock ?? {})
        .use(Blockquote, options.blockquote ?? {});

    if (options.image !== false) builder.use(typeof options.image === 'function' ? options.image : Image);
    if (options.heading !== false) {
        if (typeof options.heading === 'function') builder.use(options.heading);
        else builder.use(Heading, options.heading ?? {});
    }
};
