import {SafeEventEmitter} from './events';
import type {
    MarkdownEditorEventMap,
    MarkdownEditorInstance,
    MarkdownEditorMode,
    MarkdownEditorOptions,
} from '../public-types';

/** Headless editor state shared by the future Vue component and composable. */
export class MarkdownEditor implements MarkdownEditorInstance {
    readonly #events = new SafeEventEmitter<MarkdownEditorEventMap>();
    readonly #focusHandler: () => void;
    #destroyed = false;
    #mode: MarkdownEditorMode;
    #value: string;

    constructor(options: MarkdownEditorOptions = {}) {
        this.#mode = options.mode ?? 'wysiwyg';
        this.#value = options.initialValue ?? '';
        this.#focusHandler = options.onFocus ?? (() => undefined);

        if (options.onChange !== undefined) {
            this.#events.on('change', options.onChange);
        }
        if (options.onModeChange !== undefined) {
            this.#events.on('modeChange', options.onModeChange);
        }
    }

    destroy(): void {
        if (this.#destroyed) {
            return;
        }

        this.#destroyed = true;
        this.#events.clear();
    }

    focus(): void {
        this.assertActive();
        this.#focusHandler();
    }

    getMode(): MarkdownEditorMode {
        return this.#mode;
    }

    getValue(): string {
        return this.#value;
    }

    off<Key extends keyof MarkdownEditorEventMap>(
        type: Key,
        listener: (value: MarkdownEditorEventMap[Key]) => void,
    ): void {
        this.#events.off(type, listener);
    }

    on<Key extends keyof MarkdownEditorEventMap>(
        type: Key,
        listener: (value: MarkdownEditorEventMap[Key]) => void,
    ): void {
        this.assertActive();
        this.#events.on(type, listener);
    }

    setMode(mode: MarkdownEditorMode): void {
        this.assertActive();
        if (mode === this.#mode) {
            return;
        }

        this.#mode = mode;
        this.#events.emit('modeChange', mode);
    }

    setValue(value: string): void {
        this.assertActive();
        if (value === this.#value) {
            return;
        }

        this.#value = value;
        this.#events.emit('change', value);
    }

    private assertActive(): void {
        if (this.#destroyed) {
            throw new Error('MarkdownEditor has been destroyed');
        }
    }
}

export function createMarkdownEditor(options: MarkdownEditorOptions = {}): MarkdownEditor {
    return new MarkdownEditor(options);
}
