import {describe, expect, it} from 'vitest';

import {ParserTokenRegistry, SchemaSpecRegistry, SerializerTokenRegistry} from './registries';

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
