import type {ExtensionAuto} from '../core/extension-builder';

import {FullPreset} from './full';
import type {FullPresetOptions} from './full';

export type FullSpecsPresetOptions = FullPresetOptions;

/** Specs entry point for the Vue port's merged extension registrations. */
export const FullSpecsPreset: ExtensionAuto<FullSpecsPresetOptions> = (builder, options) => {
    builder.use(FullPreset, options);
};
