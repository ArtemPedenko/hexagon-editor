import {
    defaultMarkdownParser,
    defaultMarkdownSerializer,
    schema as defaultMarkdownSchema,
} from 'prosemirror-markdown';
import MarkdownIt from 'markdown-it';
import type {Node as ProseMirrorNode} from 'prosemirror-model';
import type {MarkdownParser, MarkdownSerializer} from 'prosemirror-markdown';

export interface MarkdownCodecOptions {
    parser?: MarkdownParser;
    serializer?: MarkdownSerializer;
}

/**
 * The CommonMark/YFM codec foundation.
 *
 * The default parser and serializer cover the base Markdown document model.
 * Later extension tasks replace these collaborators with YFM-aware variants
 * while keeping this stable interface for the editor instance.
 */
export class MarkdownCodec {
    readonly #parser: MarkdownParser;
    readonly #serializer: MarkdownSerializer;

    constructor(options: MarkdownCodecOptions = {}) {
        this.#parser = options.parser ?? defaultMarkdownParser;
        this.#serializer = options.serializer ?? defaultMarkdownSerializer;
    }

    parse(markdown: string): ProseMirrorNode {
        return this.#parser.parse(markdown);
    }

    serialize(document: ProseMirrorNode): string {
        return this.#serializer.serialize(document);
    }
}

const markdownPreviewRenderer = new MarkdownIt('commonmark', {html: false}).enable('table');

/** Render untrusted Markdown as safe HTML for a local preview surface. */
export function renderMarkdownPreview(markdown: string): string {
    return markdownPreviewRenderer.render(markdown);
}

export {defaultMarkdownSchema};
