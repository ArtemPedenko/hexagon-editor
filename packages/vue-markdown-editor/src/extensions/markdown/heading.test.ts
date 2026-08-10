import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';

import {Heading, headingLevelAttr, headingNodeName, toHeading} from './heading';

describe('Heading extension', () => {
    it('parses and serializes heading levels', () => {
        const result = ExtensionsManager.process(
            (builder) => builder.use(Heading, {h2Key: 'Mod-Alt-2'}),
            {baseSchema: basicMarkdownSchema},
        );
        const parsed = result.textParser.parse('## Heading');

        expect(parsed.firstChild?.type.name).toBe(headingNodeName);
        expect(parsed.firstChild?.attrs[headingLevelAttr]).toBe(2);
        expect(result.serializer.serialize(parsed)).toBe('## Heading\n');
        expect(result.plugins).toHaveLength(2);
    });

    it('toggles an equal heading level back to paragraph', () => {
        const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('text'));
        const documentNode = basicMarkdownSchema.node('doc', null, [paragraph]);
        const initial = EditorState.create({
            doc: documentNode,
            schema: basicMarkdownSchema,
            selection: TextSelection.create(documentNode, 1, 5),
        });
        let heading = initial;
        expect(toHeading(2)(initial, (transaction) => {
            heading = initial.apply(transaction);
        })).toBe(true);
        expect(heading.doc.firstChild?.type.name).toBe(headingNodeName);

        const selectedHeading = EditorState.create({
            doc: heading.doc,
            schema: basicMarkdownSchema,
            selection: TextSelection.create(heading.doc, 1),
        });
        let paragraphState = selectedHeading;
        expect(toHeading(2)(selectedHeading, (transaction) => {
            paragraphState = selectedHeading.apply(transaction);
        })).toBe(true);
        expect(paragraphState.doc.firstChild?.type.name).toBe('paragraph');
    });
});
