import {describe, expect, it} from 'vitest';

import MarkdownIt from 'markdown-it';
import {defaultMarkdownParser, schema as defaultMarkdownSchema} from 'prosemirror-markdown';

import {
    ParserTokenRegistry,
    ParserTokensRegistry,
    SchemaSpecRegistry,
    SerializerTokenRegistry,
    SerializerTokensRegistry,
} from './registries';

describe('SchemaSpecRegistry', () => {
    it('applies a dynamic node modifier before creating the schema', () => {
        const registry = new SchemaSpecRegistry(undefined, {
            processNodeSpec: (name, spec) => (name === 'paragraph' ? {...spec, atom: true} : spec),
        });

        const schema = registry
            .addNode('doc', {content: 'block+'})
            .addNode('paragraph', {content: 'inline*', group: 'block'})
            .addNode('text', {group: 'inline'})
            .createSchema();

        expect(schema.nodes.paragraph?.isAtom).toBe(true);
    });
});

describe('runtime token registries', () => {
    it('creates parser and serializer instances from registered tokens', () => {
        const parser = new ParserTokensRegistry();
        for (const [name, token] of Object.entries(defaultMarkdownParser.tokens)) parser.addToken(name, token);
        const serializer = new SerializerTokensRegistry()
            .addNode('paragraph', (state, node) => { state.renderInline(node); state.closeBlock(node); })
            .addNode('text', (state, node) => state.text(node.text ?? ''))
            .addMark('em', {close: '*', open: '*'});

        const document = parser.createParser(defaultMarkdownSchema, new MarkdownIt('commonmark')).parse('*Text*');

        expect(document.firstChild?.textContent).toBe('Text');
        expect(serializer.createSerializer().serialize(document)).toBe('*Text*\n');
    });
});

describe('token registries', () => {
    it('returns snapshots rather than mutable internal maps', () => {
        const parser = new ParserTokenRegistry<string>().add('paragraph', 'paragraph_open');
        const serializer = new SerializerTokenRegistry<string, string>()
            .addNode('paragraph', 'paragraph')
            .addMark('strong', 'strong');

        const parserSnapshot = parser.entries();
        const nodeSnapshot = serializer.nodes();

        expect(parserSnapshot.get('paragraph')).toBe('paragraph_open');
        expect(nodeSnapshot.get('paragraph')).toBe('paragraph');
        expect(serializer.marks().get('strong')).toBe('strong');
        expect(parserSnapshot).not.toBe(parser.entries());
        expect(nodeSnapshot).not.toBe(serializer.nodes());
    });
});
