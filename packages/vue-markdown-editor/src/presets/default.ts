import type { ExtensionAuto } from '../core/extension-builder';
import { Strike } from '../extensions/markdown/strike';
import { Table } from '../extensions/markdown/table';

import { CommonMarkPreset } from './commonmark';
import type { CommonMarkPresetOptions } from './commonmark';

export type DefaultPresetOptions = CommonMarkPresetOptions;

/** Upstream default preset: CommonMark plus strikethrough and tables. */
export const DefaultPreset: ExtensionAuto<DefaultPresetOptions> = (builder, options) => {
  builder.use(CommonMarkPreset, options).use(Strike).use(Table);
};
