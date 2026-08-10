import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownCodec} from './basic-editor';
import {sinkOnlySelectedListItem, toList} from './lists';

function positionOf(document: EditorState['doc'], text: string): number {
    let position = -1;
    document.descendants((node, offset) => {
        if (node.textContent === text) position = offset + 1;
    });
    return position;
}

describe('Gravity UI Lists port', () => {
    it('preserves list markers and the ordered-list start during Markdown round-trip', () => {
        const source = '+ First\n+ Second\n\n3) Third\n4) Fourth';
        const document = basicMarkdownCodec.parse(source);

        expect(document.child(0).attrs).toMatchObject({markup: '+', tight: true});
        expect(document.child(1).attrs).toMatchObject({markup: ')', order: 3, tight: true});
        expect(basicMarkdownCodec.serialize(document)).toBe(source);
    });

    it('converts an enclosing bullet list instead of wrapping it again', () => {
        const document = basicMarkdownCodec.parse('* First\n* Second');
        const state = EditorState.create({
            doc: document,
            selection: TextSelection.create(document, positionOf(document, 'First')),
        });
        let nextState = state;

        expect(toList(document.type.schema.nodes.ordered_list!)(state, (transaction) => {
            nextState = state.apply(transaction);
        })).toBe(true);
        expect(nextState.doc.firstChild?.type.name).toBe('ordered_list');
        expect(nextState.doc.firstChild?.childCount).toBe(2);
    });

    it('sinks only the selected list item using the upstream transaction algorithm', () => {
        const document = basicMarkdownCodec.parse('* First\n* Second');
        const state = EditorState.create({
            doc: document,
            selection: TextSelection.create(document, positionOf(document, 'Second')),
        });
        let nextState = state;

        expect(sinkOnlySelectedListItem(document.type.schema.nodes.list_item!)(state, (transaction) => {
            nextState = state.apply(transaction);
        })).toBe(true);
        expect(basicMarkdownCodec.serialize(nextState.doc)).toBe('* First\n  * Second');
    });
});
