import type {Schema} from 'prosemirror-model';
import type {Command} from 'prosemirror-state';

import {setImageDisplay} from '../extensions/markdown/image';
import type {ImageObjectFit} from '../extensions/markdown/image';
import {insertTable} from '../extensions/markdown/table';

export function getBasicNodeType(schema: Schema, name: string) {
    const nodeType = schema.nodes[name];
    if (nodeType === undefined) throw new Error(`Missing basic editor node type: ${name}`);
    return nodeType;
}

export function getBasicMarkType(schema: Schema, name: string) {
    const markType = schema.marks[name];
    if (markType === undefined) throw new Error(`Missing basic editor mark type: ${name}`);
    return markType;
}

export function createTableCommand(rows = 3, columns = 3): Command {
    return insertTable(rows, columns);
}

export function insertFileCommand(schema: Schema, href: string, name: string): Command {
    return (state, dispatch) => {
        if (dispatch !== undefined) {
            const link = getBasicMarkType(schema, 'link').create({href});
            dispatch(state.tr.replaceSelectionWith(state.schema.text(name, [link]), false).scrollIntoView());
        }
        return true;
    };
}

export function insertImageCommand(schema: Schema, src: string, alt: string, title?: string): Command {
    return (state, dispatch) => {
        if (dispatch !== undefined) {
            const image = getBasicNodeType(schema, 'image').create({alt, src, title: title ?? null, width: '100%', 'object-fit': 'contain'});
            dispatch(state.tr.replaceSelectionWith(image).scrollIntoView());
        }
        return true;
    };
}

export function setColorCommand(schema: Schema, color: string): Command {
    return (state, dispatch) => {
        const mark = getBasicMarkType(schema, 'color');
        if (dispatch !== undefined) {
            const {empty, from, to} = state.selection;
            const transaction = empty
                ? state.tr.removeStoredMark(mark).addStoredMark(mark.create({color}))
                : state.tr.removeMark(from, to, mark).addMark(from, to, mark.create({color}));
            dispatch(transaction.scrollIntoView());
        }
        return true;
    };
}

export function setImageDisplayCommand(width?: number | string, objectFit?: ImageObjectFit, height?: number | null): Command {
    return setImageDisplay({
        ...(height === undefined ? {} : {height}),
        ...(width === undefined ? {} : {width}),
        ...(objectFit === undefined ? {} : {objectFit}),
    });
}
