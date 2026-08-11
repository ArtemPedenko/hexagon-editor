import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';
import {NodeSelection} from 'prosemirror-state';
import type {Command, EditorState, Transaction} from 'prosemirror-state';
import {Plugin} from 'prosemirror-state';
import type MarkdownIt from 'markdown-it';

import type {ExtensionAuto} from '../../core/extension-builder';

export const imageNodeName = 'image';
export const ImageAttr = {Alt: 'alt', Height: 'height', Loading: 'loading', ObjectFit: 'object-fit', Src: 'src', Title: 'title', Width: 'width'} as const;
export const imageObjectFitValues = ['contain', 'cover', 'fill', 'none', 'scale-down'] as const;
export type ImageObjectFit = typeof imageObjectFitValues[number];

export const imageNodeSpec: NodeSpec = {
    attrs: {
        [ImageAttr.Alt]: {default: null},
        [ImageAttr.Height]: {default: null},
        [ImageAttr.Loading]: {default: null},
        [ImageAttr.ObjectFit]: {default: 'contain'},
        [ImageAttr.Src]: {},
        [ImageAttr.Title]: {default: null},
        [ImageAttr.Width]: {default: null},
    },
    draggable: true,
    group: 'inline',
    inline: true,
    allowSelection: true,
    parseDOM: [{
        getAttrs: (node) => ({
            [ImageAttr.Alt]: (node as Element).getAttribute(ImageAttr.Alt),
            [ImageAttr.Height]: (node as Element).getAttribute(ImageAttr.Height),
            [ImageAttr.Loading]: (node as Element).getAttribute(ImageAttr.Loading),
            [ImageAttr.ObjectFit]: (node as Element).getAttribute('data-image-object-fit') || 'contain',
            [ImageAttr.Src]: (node as Element).getAttribute(ImageAttr.Src),
            [ImageAttr.Title]: (node as Element).getAttribute(ImageAttr.Title),
            [ImageAttr.Width]: (node as Element).getAttribute(ImageAttr.Width),
        }),
        tag: 'img[src]',
    }],
    toDOM: (node) => {
        const image = document.createElement('img');
        for (const [name, value] of Object.entries(node.attrs)) {
            if (value === null || name === ImageAttr.ObjectFit || name === ImageAttr.Width || name === ImageAttr.Height) continue;
            image.setAttribute(name, String(value));
        }
        image.dataset.imageObjectFit = node.attrs[ImageAttr.ObjectFit] as string;
        image.style.objectFit = node.attrs[ImageAttr.ObjectFit] as string;
        if (node.attrs[ImageAttr.Width] !== null) image.style.width = String(node.attrs[ImageAttr.Width]).includes('%') ? String(node.attrs[ImageAttr.Width]) : `${node.attrs[ImageAttr.Width]}px`;
        if (node.attrs[ImageAttr.Height] !== null) image.style.height = `${node.attrs[ImageAttr.Height]}px`;
        return image;
    },
};

export const imageTokenSpec: ParseSpec = {
    getAttrs: (token) => ({
        [ImageAttr.Alt]: token.children?.[0]?.content || null,
        [ImageAttr.Height]: token.attrGet(ImageAttr.Height) || null,
        [ImageAttr.Loading]: token.attrGet(ImageAttr.Loading) || null,
        [ImageAttr.ObjectFit]: token.attrGet(ImageAttr.ObjectFit) || 'contain',
        [ImageAttr.Src]: token.attrGet(ImageAttr.Src),
        [ImageAttr.Title]: token.attrGet(ImageAttr.Title) || null,
        [ImageAttr.Width]: token.attrGet(ImageAttr.Width) || null,
    }),
    node: imageNodeName,
};

export const serializeImage: Parameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
    const {attrs} = node;
    let result = `![${attrs[ImageAttr.Alt] ? state.esc(attrs[ImageAttr.Alt] as string) : ''}](${attrs[ImageAttr.Src] ? state.esc(attrs[ImageAttr.Src] as string) : ''}`;
    if (attrs[ImageAttr.Title]) result += ` ${state.quote(attrs[ImageAttr.Title] as string)}`;
    result += ')';
    const dimensions = [ImageAttr.Width, ImageAttr.Height, ImageAttr.ObjectFit]
        .map((name) => attrs[name] === null ? '' : `${name}=${attrs[name]}`)
        .filter(Boolean)
        .join(' ');
    state.write(dimensions === '' ? result : `${result}{${dimensions}}`);
};

/** Reads the local Markdown attribute suffix emitted for resized images. */
export function configureImageMarkdown(markdown: MarkdownIt): MarkdownIt {
    markdown.core.ruler.after('inline', 'image_dimensions', (state) => {
        for (const token of state.tokens) {
            if (token.type !== 'inline' || token.children === null) continue;
            for (const [index, image] of token.children.entries()) {
                if (index === token.children.length - 1) continue;
                const suffix = token.children[index + 1];
                if (image?.type !== 'image' || suffix?.type !== 'text') continue;
                const match = suffix.content.match(/^\{width=(\d+%?)(?:\s+height=(\d+))?(?:\s+object-fit=(contain|cover|fill|none|scale-down))?\}/);
                if (match === null) continue;
                image.attrSet(ImageAttr.Width, match[1] ?? '');
                if (match[2] !== undefined) image.attrSet(ImageAttr.Height, match[2]);
                if (match[3] !== undefined) image.attrSet(ImageAttr.ObjectFit, match[3]);
                suffix.content = suffix.content.slice(match[0].length);
            }
        }
    });
    return markdown;
}

export interface AddImageAttrs {
    alt?: string;
    height?: number;
    objectFit?: ImageObjectFit;
    src: string;
    title?: string;
    width?: number | string;
}

export const setImageDisplay = (attrs: {height?: number | null; objectFit?: ImageObjectFit; width?: number | string}): Command => (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection) || state.selection.node.type.name !== imageNodeName) return false;
    const nextAttrs = {
        ...state.selection.node.attrs,
        ...(attrs.height === undefined ? {} : {[ImageAttr.Height]: attrs.height}),
        ...(attrs.width === undefined ? {} : {[ImageAttr.Width]: attrs.width}),
        ...(attrs.objectFit === undefined ? {} : {[ImageAttr.ObjectFit]: attrs.objectFit}),
    };
    const transaction = state.tr.setNodeMarkup(state.selection.from, undefined, nextAttrs);
    dispatch?.(transaction.setSelection(NodeSelection.create(transaction.doc, state.selection.from)));
    return true;
};

export const addImage =
    (attrs: AddImageAttrs): Command =>
    (state, dispatch) => {
        if (!state.selection.empty || attrs.src.length === 0) return false;
        dispatch?.(state.tr.insert(state.selection.from, getImageType(state.schema).create(attrs)).scrollIntoView());
        return true;
    };

export function getImageType(schema: EditorState['schema']) {
    const image = schema.nodes[imageNodeName];
    if (image === undefined) throw new Error('Image extension requires an image node');
    return image;
}

export const Image: ExtensionAuto = (builder) => {
    builder
        .addNodeSpec(imageNodeName, () => imageNodeSpec)
        .configureMd(configureImageMarkdown)
        .addMarkdownTokenParserSpec(imageNodeName, () => imageTokenSpec)
        .addNodeSerializerSpec(imageNodeName, () => serializeImage)
        .addPlugin(() => new Plugin({
            props: {
                handlePaste: (view, event) => insertPastedImage(view.state, view.dispatch, event),
            },
        }));
};

function insertPastedImage(state: EditorState, dispatch: (transaction: Transaction) => void, event: ClipboardEvent): boolean {
    const src = event.clipboardData?.getData('text/plain').trim() ?? '';
    if (!isImageUrl(src)) return false;
    event.preventDefault();
    const image = getImageType(state.schema).create({
        [ImageAttr.Alt]: getImageAlt(src),
        [ImageAttr.ObjectFit]: 'contain',
        [ImageAttr.Src]: src,
        [ImageAttr.Width]: '100%',
    });
    dispatch(state.tr.replaceSelectionWith(image).scrollIntoView());
    return true;
}

function isImageUrl(value: string): boolean {
    if (value.startsWith('data:image/')) return true;
    try {
        const {pathname, protocol} = new URL(value);
        return (protocol === 'http:' || protocol === 'https:') && /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(pathname);
    } catch {
        return false;
    }
}

function getImageAlt(src: string): string {
    try {
        const pathname = new URL(src).pathname;
        return pathname.slice(pathname.lastIndexOf('/') + 1) || 'Image';
    } catch {
        return 'Image';
    }
}
