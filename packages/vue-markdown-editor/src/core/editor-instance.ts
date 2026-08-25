import { SafeEventEmitter } from './events';
import type { EditorAction, EditorActions } from './actions';
import type {
	ChangeEditorModeOptions,
	MarkdownEditorCursorPosition,
	MarkdownEditorEventMap,
	MarkdownEditorInstance,
	MarkdownEditorMode,
	MarkdownEditorOptions,
	MarkdownEditorPreset,
} from '../public-types';

/** Framework-neutral public editor instance used by Vue hosts and integrations. */
export class MarkdownEditor implements MarkdownEditorInstance {
	readonly #events = new SafeEventEmitter<MarkdownEditorEventMap>();
	readonly #focusHandler: () => void;
	readonly #hasFocusHandler: () => boolean;
	readonly #moveCursorHandler: (position: MarkdownEditorCursorPosition) => void;
	readonly #beforeEditorModeChange: MarkdownEditorOptions['beforeEditorModeChange'];
	readonly #actions: Readonly<EditorActions>;
	readonly #preset: MarkdownEditorPreset;
	#destroyed = false;
	#mode: MarkdownEditorMode;
	#readonly: boolean;
	#toolbarVisible: boolean;
	#value: string;

	constructor(options: MarkdownEditorOptions = {}) {
		this.#mode = options.mode ?? options.initial?.mode ?? 'wysiwyg';
		this.#value = options.initialValue ?? options.initial?.markup ?? '';
		this.#readonly = options.readonly ?? options.initial?.readonly ?? false;
		this.#toolbarVisible = options.toolbarVisible ?? options.initial?.toolbarVisible ?? true;
		this.#preset = options.preset ?? 'full';
		this.#focusHandler = options.onFocus ?? (() => undefined);
		this.#hasFocusHandler = options.onHasFocus ?? (() => false);
		this.#moveCursorHandler = options.onMoveCursor ?? (() => undefined);
		this.#beforeEditorModeChange = options.beforeEditorModeChange;
		this.#actions = Object.freeze({ ...options.actions });

		if (options.onChange !== undefined) this.#events.on('change', options.onChange);
		if (options.onModeChange !== undefined) this.#events.on('modeChange', options.onModeChange);
	}

	get actions(): Readonly<EditorActions> {
		return this.#actions;
	}
	get currentMode(): MarkdownEditorMode {
		return this.#mode;
	}
	get preset(): MarkdownEditorPreset {
		return this.#preset;
	}
	get readonly(): boolean {
		return this.#readonly;
	}
	get toolbarVisible(): boolean {
		return this.#toolbarVisible;
	}

	append(markup: string): void {
		this.setValue(joinMarkdown(this.#value, markup));
	}
	action(name: string): EditorAction<unknown, unknown> | undefined {
		return this.#actions[name];
	}

	changeEditorMode({ emit = true, ...options }: ChangeEditorModeOptions): void {
		this.assertActive();
		if (options.mode === this.#mode) return;
		if (this.#beforeEditorModeChange?.(options) === false) return;
		this.#mode = options.mode;
		this.#events.emit('modeChange', options.mode);
		if (emit) this.#events.emit('changeEditorMode', { ...options, emit });
	}

	changeToolbarVisibility({ visible }: { visible: boolean }): void {
		this.assertActive();
		if (visible === this.#toolbarVisible) return;
		this.#toolbarVisible = visible;
		this.#events.emit('changeToolbarVisibility', { visible });
	}

	clear(): void {
		this.setValue('');
	}

	destroy(): void {
		if (this.#destroyed) return;
		this.#events.emit('destroy', undefined);
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
	hasFocus(): boolean {
		this.assertActive();
		return this.#hasFocusHandler();
	}
	insert(markup: string): void {
		this.append(markup);
	}
	isEmpty(): boolean {
		return this.#value.length === 0;
	}
	moveCursor(position: MarkdownEditorCursorPosition): void {
		this.assertActive();
		this.#moveCursorHandler(position);
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

	prepend(markup: string): void {
		this.setValue(joinMarkdown(markup, this.#value));
	}
	replace(markup: string): void {
		this.setValue(markup);
	}
	setEditorMode(mode: MarkdownEditorMode, options: Pick<ChangeEditorModeOptions, 'emit'> = {}): void {
		this.changeEditorMode({ mode, reason: 'manually', ...options });
	}
	setMode(mode: MarkdownEditorMode): void {
		this.setEditorMode(mode);
	}

	setReadonly(readonly: boolean): void {
		this.assertActive();
		if (readonly === this.#readonly) return;
		this.#readonly = readonly;
		this.#events.emit('changeReadonly', { readonly });
	}

	setValue(value: string): void {
		this.assertActive();
		if (value === this.#value) return;
		this.#value = value;
		this.#events.emit('change', value);
	}

	private assertActive(): void {
		if (this.#destroyed) throw new Error('MarkdownEditor has been destroyed');
	}
}

function joinMarkdown(left: string, right: string): string {
	if (left.length === 0) return right;
	if (right.length === 0) return left;
	return `${left}\n\n${right}`;
}

export function createMarkdownEditor(options: MarkdownEditorOptions = {}): MarkdownEditor {
	return new MarkdownEditor(options);
}
