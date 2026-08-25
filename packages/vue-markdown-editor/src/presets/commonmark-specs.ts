import type { ExtensionAuto } from '../core/extension-builder';

import { CommonMarkPreset } from './commonmark';
import type { CommonMarkPresetOptions } from './commonmark';

export type CommonMarkSpecsPresetOptions = CommonMarkPresetOptions;

/**
 * Specs entry point for the merged Vue extension architecture, where schema,
 * parser and serializer registrations live beside each runtime extension.
 */
export const CommonMarkSpecsPreset: ExtensionAuto<CommonMarkSpecsPresetOptions> = (builder, options) => {
	builder.use(CommonMarkPreset, options);
};
