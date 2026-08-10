import type {ExtensionAuto} from '../../core/extension-builder';

import {goToTableCell, moveToNextTableRow} from './table-actions';
import {TableSpecs} from './table-specs';

/** CommonMark table schema and Markdown codec registrations. */
export const Table: ExtensionAuto = (builder) => {
    builder
        .configureMd((markdown) => markdown.enable('table'))
        .use(TableSpecs)
        .addKeymap(() => ({
            Enter: moveToNextTableRow,
            'Shift-Enter': moveToNextTableRow,
            'Shift-Tab': goToTableCell('prev'),
            Tab: goToTableCell('next'),
        }));
};

export {TableAttrs, TableCellAlign, TableNode, TableSpecs, tableNodeSpecs, tableSerializerNodes, tableTokenSpecs} from './table-specs';
export {addTableColumn, addTableRow, createTable, deleteTable, deleteTableColumn, deleteTableRow, goToTableCell, insertTable, moveToNextTableRow, setTableColumnAlignment} from './table-actions';
