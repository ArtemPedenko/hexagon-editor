import {autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom';
import type {Placement} from '@floating-ui/dom';
import {nextTick, onBeforeUnmount, ref} from 'vue';
import type {Ref} from 'vue';

export interface FloatingPanel {
    close(): void;
    contains(target: Node): boolean;
    open(reference: HTMLElement): Promise<void>;
    toggle(reference: HTMLElement): Promise<void>;
    visible: Ref<boolean>;
}

const inheritedVariables = [
    '--markdown-background',
    '--markdown-border',
    '--markdown-focus-background',
    '--markdown-focus-text',
    '--markdown-text',
];

export function useFloatingPanel(
    getElement: () => HTMLElement | undefined,
    options: {placement?: Placement} = {},
): FloatingPanel {
    const visible = ref(false);
    let stopPositioning: (() => void) | undefined;

    function close(): void {
        visible.value = false;
        stopPositioning?.();
        stopPositioning = undefined;
    }

    async function open(reference: HTMLElement): Promise<void> {
        close();
        visible.value = true;
        await nextTick();
        const floating = getElement();
        if (floating === undefined) return;

        const editor = reference.closest<HTMLElement>('.markdown-editor');
        if (editor !== null) {
            const editorStyles = getComputedStyle(editor);
            for (const name of inheritedVariables) {
                floating.style.setProperty(name, editorStyles.getPropertyValue(name));
            }
        }

        const update = async (): Promise<void> => {
            const {x, y} = await computePosition(reference, floating, {
                middleware: [offset(6), flip({padding: 8}), shift({padding: 8})],
                placement: options.placement ?? 'bottom-start',
                strategy: 'fixed',
            });
            Object.assign(floating.style, {left: `${x}px`, position: 'fixed', top: `${y}px`});
        };
        stopPositioning = autoUpdate(reference, floating, update);
    }

    async function toggle(reference: HTMLElement): Promise<void> {
        if (visible.value) {
            close();
        } else {
            await open(reference);
        }
    }

    onBeforeUnmount(close);

    return {
        close,
        contains: (target) => getElement()?.contains(target) ?? false,
        open,
        toggle,
        visible,
    };
}
