import type { Component } from 'vue';
import { TextSelection } from 'prosemirror-state';

import { createVueContextPanelPlugin } from '../../core/vue-renderer';
import type { VueContextPanelOptions } from '../../core/vue-renderer';
import type { ExtensionAuto } from '../../core/extension-builder';

export interface SelectionContextOptions extends VueContextPanelOptions {
	component?: Component;
}

/** Vue renderer equivalent of upstream SelectionContext's text-selection tooltip. */
export const SelectionContext: ExtensionAuto<SelectionContextOptions> = (builder, options) => {
	if (options?.component === undefined) return;
	builder.addPlugin(() =>
		createVueContextPanelPlugin(options.component!, {
			...options,
			shouldShow: (state) => state.selection instanceof TextSelection && (options.shouldShow?.(state) ?? true),
		}),
	);
};
