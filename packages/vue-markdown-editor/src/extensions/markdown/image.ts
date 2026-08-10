import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';
import type {Command, EditorState} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

export const imageNodeName = 'image';
export const ImageAttr = {Alt: 'alt', Loading: 'loading', Src: 'src', Title: 'title'} as const;

export const imageNodeSpec: NodeSpec = {
    attrs: {
        [ImageAttr.Alt]: {default: null},
        [ImageAttr.Loading]: {default: null},
        [ImageAttr.Src]: {},
        [ImageAttr.Title]: {default: null},
    },
    draggable: true,
    group: 'inline',
    inline: true,
    parseDOM: [{
        getAttrs: (node) => ({
            [ImageAttr.Alt]: (node as Element).getAttribute(ImageAttr.Alt),
            [ImageAttr.Loading]: (node as Element).getAttribute(ImageAttr.Loading),
            [ImageAttr.Src]: (node as Element).getAttribute(ImageAttr.Src),
            [ImageAttr.Title]: (node as Element).getAttribute(ImageAttr.Title),
        }),
        tag: 'img[src]',
    }],
    toDOM: (node) => ['img', node.attrs],
};

export const imageTokenSpec: ParseSpec = {
    getAttrs: (token) => ({
        [ImageAttr.Alt]: token.children?.[0]?.content || null,
        [ImageAttr.Loading]: token.attrGet(ImageAttr.Loading) || null,
        [ImageAttr.Src]: token.attrGet(ImageAttr.Src),
        [ImageAttr.Title]: token.attrGet(ImageAttr.Title) || null,
    }),
    node: imageNodeName,
};

export const serializeImage: Parameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
    const {attrs} = node;
    let result = `![${attrs[ImageAttr.Alt] ? state.esc(attrs[ImageAttr.Alt] as string) : ''}](${attrs[ImageAttr.Src] ? state.esc(attrs[ImageAttr.Src] as string) : ''}`;
    if (attrs[ImageAttr.Title]) result += ` ${state.quote(attrs[ImageAttr.Title] as string)}`;
    state.write(`${result})`);
};

export interface AddImageAttrs {
    alt?: string;
    src: string;
    title?: string;
}

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
        .addMarkdownTokenParserSpec(imageNodeName, () => imageTokenSpec)
        .addNodeSerializerSpec(imageNodeName, () => serializeImage);
};
