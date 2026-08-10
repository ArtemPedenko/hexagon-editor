import type {ExtensionAuto} from '../core/extension-builder';
import {BaseInputRules, BaseKeymap, BaseSchema} from '../extensions/base';

export interface ZeroPresetOptions {
    baseSchema?: import('../extensions/base').BaseSchemaOptions;
}

/** Upstream zero preset adapted for the current ProseMirror-backed manager. */
export const ZeroPreset: ExtensionAuto<ZeroPresetOptions> = (builder, options) => {
    builder
        .use(BaseSchema, options?.baseSchema ?? {})
        .use(BaseKeymap)
        .use(BaseInputRules);
};
