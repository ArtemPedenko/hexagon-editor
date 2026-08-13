import type {Node, NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

export const listNodeSpecs: Record<'bullet_list' | 'list_item' | 'ordered_list', NodeSpec> = {
    list_item: {
        attrs: {'data-line': {default: null}, markup: {default: null}},
        content: '(paragraph|block)+',
        defining: true,
        parseDOM: [{tag: 'li'}],
        toDOM: (node) => ['li', node.attrs, 0],
    },
    bullet_list: {
        attrs: {markup: {default: '*'}, tight: {default: true}},
        content: 'list_item+',
        group: 'block',
        parseDOM: [{tag: 'ul', getAttrs: (dom) => ({tight: (dom as HTMLElement).hasAttribute('data-tight')})}],
        toDOM: (node) => ['ul', {'data-tight': node.attrs.tight ? 'true' : null}, 0],
    },
    ordered_list: {
        attrs: {markup: {default: '.'}, order: {default: 1}, tight: {default: true}},
        content: 'list_item+',
        group: 'block',
        parseDOM: [{
            tag: 'ol',
            getAttrs: (dom) => ({
                order: (dom as HTMLElement).hasAttribute('start') ? Number((dom as HTMLElement).getAttribute('start')) : 1,
                tight: (dom as HTMLElement).hasAttribute('data-tight'),
            }),
        }],
        toDOM: (node) => ['ol', {start: node.attrs.order === 1 ? null : node.attrs.order, 'data-tight': node.attrs.tight ? 'true' : null}, 0],
    },
};

export const listTokenSpecs: Record<'bullet_list' | 'list_item' | 'ordered_list', ParseSpec> = {
    bullet_list: {block: 'bullet_list', getAttrs: (token, tokens, index) => ({markup: token.markup, tight: isListTight(tokens, index)})},
    list_item: {block: 'list_item', getAttrs: (token) => ({'data-line': token.attrGet('data-line'), markup: token.markup})},
    ordered_list: {block: 'ordered_list', getAttrs: (token, tokens, index) => ({markup: token.markup, order: Number(token.attrGet('start')) || 1, tight: isListTight(tokens, index)})},
};

export const listSerializerNodes: Partial<Record<'bullet_list' | 'list_item' | 'ordered_list', ConstructorParameters<typeof MarkdownSerializer>[0][string]>> = {
    bullet_list(state, node) {
        state.renderList(node, '  ', () => `${getListMarkup(node, ['-', '+', '*'], '*')} `);
    },
    ordered_list(state, node) {
        const start = Number(node.attrs.order) || 1;
        const maxWidth = String(start + node.childCount - 1).length;
        const space = state.repeat(' ', maxWidth + 2);
        state.renderList(node, space, (index) => {
            const number = String(start + index);
            const markup = getListMarkup(node, ['.', ')'], '.');
            return `${state.repeat(' ', maxWidth - number.length)}${number}${markup} `;
        });
    },
};

function isListTight(tokens: Array<{hidden: boolean; type: string}>, index: number): boolean {
    for (let next = index + 1; next < tokens.length; next += 1) {
        if (tokens[next]?.type !== 'list_item_open') return tokens[next]?.hidden === true;
    }
    return false;
}

function getListMarkup(list: Node, supported: readonly string[], fallback: string): string {
    const markup = list.attrs.markup;
    return supported.includes(markup) ? markup : fallback;
}
