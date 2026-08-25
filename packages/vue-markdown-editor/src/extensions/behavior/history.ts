import { history, redo, undo } from 'prosemirror-history';
import type { Command } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

export interface HistoryOptions {
	config?: Parameters<typeof history>[0];
	redoKey?: string | null;
	undoKey?: string | null;
}

export enum HistoryAction {
	Redo = 'redo',
	Undo = 'undo',
}

export interface HistoryActions {
	redo: Command;
	undo: Command;
}

/** Commands consumed by Vue toolbars and preset integrations. */
export function createHistoryActions(): HistoryActions {
	return { redo, undo };
}

/** Upstream history extension, independent from the Vue editor host. */
export const History: ExtensionAuto<HistoryOptions> = (builder, options) => {
	builder.addPlugin(() => history(options?.config));
	builder.addKeymap(() => {
		const bindings = {} as Record<string, typeof undo>;
		if (options?.undoKey !== undefined && options.undoKey !== null) bindings[options.undoKey] = undo;
		if (options?.redoKey !== undefined && options.redoKey !== null) bindings[options.redoKey] = redo;
		return bindings;
	});
};
