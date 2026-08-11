import type {TableMap} from 'prosemirror-tables';
import {autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom';
import type {EditorView} from 'prosemirror-view';

export function createTablePopover(position: number, tableMap: TableMap, onAction: (event: MouseEvent, action: string, position: number) => void): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'markdown-editor__table-popover';
    controls.setAttribute('role', 'menu');
    controls.setAttribute('aria-label', 'Действия с таблицей');
    for (const [action, label, disabled, destructive] of [
        ['add-row', 'Добавить строку', false, false], ['add-column', 'Добавить колонку', false, false],
        ['delete-row', 'Удалить строку', tableMap.height === 1, true], ['delete-column', 'Удалить колонку', tableMap.width === 1, true],
    ] as const) {
        const button = document.createElement('button');
        button.className = destructive ? 'markdown-editor__table-popover-action markdown-editor__table-popover-action--danger' : 'markdown-editor__table-popover-action';
        button.dataset.tableAction = action; button.dataset.tablePosition = String(position); button.disabled = disabled; button.textContent = label; button.type = 'button'; button.setAttribute('role', 'menuitem');
        button.addEventListener('mousedown', (event) => { event.preventDefault(); event.stopPropagation(); });
        button.addEventListener('mouseup', (event) => onAction(event, action, position));
        controls.append(button);
    }
    return controls;
}

export function mountTablePopover(view: EditorView, position: number, tableMap: TableMap, onAction: (action: string, position: number) => void, onDestroy: (placeholder: HTMLElement, cleanup: () => void) => void): HTMLElement {
    let stopAutoUpdate: (() => void) | undefined;
    const controls = createTablePopover(position, tableMap, (event, action, cellPosition) => { event.preventDefault(); event.stopPropagation(); onAction(action, cellPosition); });
    document.body.append(controls);
    const reference = view.nodeDOM(position);
    if (reference instanceof HTMLElement) {
        const editor = reference.closest<HTMLElement>('.markdown-editor');
        if (editor !== null) for (const name of ['--markdown-background', '--markdown-border', '--markdown-text']) controls.style.setProperty(name, getComputedStyle(editor).getPropertyValue(name));
        const update = async (): Promise<void> => {
            const {x, y} = await computePosition(reference, controls, {middleware: [offset(6), flip({padding: 8}), shift({padding: 8})], placement: 'bottom-start', strategy: 'fixed'});
            Object.assign(controls.style, {left: `${x}px`, position: 'fixed', top: `${y}px`});
        };
        stopAutoUpdate = autoUpdate(reference, controls, update);
    }
    const placeholder = document.createElement('span');
    onDestroy(placeholder, () => { stopAutoUpdate?.(); controls.remove(); });
    return placeholder;
}
