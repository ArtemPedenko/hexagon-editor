import { Plugin, TextSelection } from 'prosemirror-state';

import {
  addTableColumn,
  addTableRow,
  deleteTable,
  deleteTableColumn,
  deleteTableRow,
  setTableColumnAlignment,
  TableCellAlign,
  TableNode,
} from '../extensions/markdown/table';

const TABLE_LONG_PRESS_DELAY = 500;

export function createUpstreamTableControlsPlugin(): Plugin {
  let closeMenu: (() => void) | undefined;
  let longPressTimer: number | undefined;
  const close = (): void => {
    closeMenu?.();
    closeMenu = undefined;
  };
  const clearLongPress = (): void => {
    if (longPressTimer === undefined) return;
    clearTimeout(longPressTimer);
    longPressTimer = undefined;
  };
  return new Plugin({
    view: () => ({
      destroy: () => {
        clearLongPress();
        close();
      },
    }),
    props: {
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const openMenu = (clientX: number, clientY: number): boolean => {
            const position = view.posAtCoords({
              left: clientX,
              top: clientY,
            })?.pos;
            if (position === undefined) return false;
            const selection = TextSelection.create(view.state.doc, position);
            const transaction = view.state.tr.setSelection(selection);
            const selectedState = view.state.apply(transaction);
            if (!addTableRow(selectedState)) return false;
            let bodyRows = 0;
            let rowCells = 0;
            for (let depth = 1; depth <= selectedState.selection.$from.depth; depth += 1) {
              const node = selectedState.selection.$from.node(depth);
              if (node.type.name === TableNode.Body) bodyRows = node.childCount;
              if (node.type.name === TableNode.Row) rowCells = node.childCount;
            }
            close();
            view.dispatch(transaction);

            const controls = document.createElement('div');
            controls.className = 'markdown-editor__table-popover';
            controls.setAttribute('aria-label', 'Действия с таблицей');
            controls.setAttribute('role', 'menu');
            const actions = [
              ['add-row', 'Добавить строку', addTableRow, false],
              ['add-column', 'Добавить колонку', addTableColumn, false],
              ['delete-row', 'Удалить строку', deleteTableRow, true, bodyRows === 1],
              ['delete-column', 'Удалить колонку', deleteTableColumn, true, rowCells === 1],
              ['delete-table', 'Удалить таблицу', deleteTable, true],
              ['align-left', 'Выровнять по левому краю', setTableColumnAlignment(TableCellAlign.Left), false],
              ['align-center', 'Выровнять по центру', setTableColumnAlignment(TableCellAlign.Center), false],
              ['align-right', 'Выровнять по правому краю', setTableColumnAlignment(TableCellAlign.Right), false],
            ] as const;
            for (const [name, label, command, destructive, disabled = false] of actions) {
              const button = document.createElement('button');
              button.className = destructive
                ? 'markdown-editor__table-popover-action markdown-editor__table-popover-action--danger'
                : 'markdown-editor__table-popover-action';
              button.dataset.tableAction = name;
              button.disabled = disabled;
              button.setAttribute('role', 'menuitem');
              button.textContent = label;
              button.type = 'button';
              button.addEventListener('mousedown', (mouseEvent) => mouseEvent.preventDefault());
              button.addEventListener('click', () => {
                command(view.state, view.dispatch);
                close();
              });
              controls.append(button);
            }
            const editor = view.dom.closest<HTMLElement>('.markdown-editor');
            if (editor !== null) {
              const editorStyles = getComputedStyle(editor);
              for (const name of ['--markdown-background', '--markdown-border', '--markdown-text']) {
                controls.style.setProperty(name, editorStyles.getPropertyValue(name));
              }
            }
            document.body.append(controls);
            const { left, top } = view.coordsAtPos(position);
            Object.assign(controls.style, {
              left: `${left}px`,
              position: 'fixed',
              top: `${top + 8}px`,
            });
            const closeOutside = (pointerEvent: PointerEvent): void => {
              if (pointerEvent.target instanceof Node && controls.contains(pointerEvent.target)) return;
              close();
            };
            document.addEventListener('pointerdown', closeOutside, true);
            closeMenu = () => {
              document.removeEventListener('pointerdown', closeOutside, true);
              controls.remove();
            };
            return true;
          };
          if (!openMenu(event.clientX, event.clientY)) return false;
          event.preventDefault();
          return true;
        },
        touchstart: (view, event) => {
          const touch = event.touches[0];
          if (touch === undefined) return false;
          clearLongPress();
          longPressTimer = window.setTimeout(() => {
            longPressTimer = undefined;
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target === null || !view.dom.contains(target)) return;
            target.dispatchEvent(
              new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: touch.clientX,
                clientY: touch.clientY,
              }),
            );
          }, TABLE_LONG_PRESS_DELAY);
          return false;
        },
        touchcancel: () => {
          clearLongPress();
          return false;
        },
        touchend: () => {
          clearLongPress();
          return false;
        },
        touchmove: () => {
          clearLongPress();
          return false;
        },
      },
    },
  });
}
