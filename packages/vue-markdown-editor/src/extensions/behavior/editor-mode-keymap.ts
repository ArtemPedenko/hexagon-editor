import type { ExtensionAuto } from '../../core/extension-builder';
import { VERSION } from '../../version';

export interface EditorModeKeymapOptions {
	onCancel?(): boolean;
	onSubmit?(): boolean;
	ignoreKeysList?: readonly string[];
}

export const EditorModeKeymap: ExtensionAuto<EditorModeKeymapOptions> = (builder, options) => {
	builder.addKeymap(() => {
		const bindings: Record<string, () => boolean> = {
			'Mod-Alt-]': () => {
				console.info(`YFM-Editor Debug info\nVersion: ${VERSION}`);
				return true;
			},
		};
		if (options?.onCancel !== undefined) bindings.Escape = options.onCancel;
		if (options?.onSubmit !== undefined) bindings['Mod-Enter'] = options.onSubmit;
		return bindings;
	});

	if (options?.ignoreKeysList?.length) {
		builder.addKeymap(
			() => Object.fromEntries(options.ignoreKeysList!.map((key) => [key, () => true])),
			builder.Priority.Lowest,
		);
	}
};
