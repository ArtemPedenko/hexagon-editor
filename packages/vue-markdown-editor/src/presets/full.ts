import type { ExtensionAuto } from '../core/extension-builder';
import { FoldingHeading } from '../extensions/additional/folding-heading';
import { Math } from '../extensions/additional/math';
import { Mermaid } from '../extensions/additional/mermaid';
import { QuoteLink } from '../extensions/additional/quote-link';
import { YfmHtmlBlock } from '../extensions/additional/yfm-html-block';
import { ClicksOnEdges } from '../extensions/behavior/clicks-on-edges';
import { Clipboard } from '../extensions/behavior/clipboard';
import { Cursor } from '../extensions/behavior/cursor';
import type { CursorOptions } from '../extensions/behavior/cursor';
import { EditorModeKeymap } from '../extensions/behavior/editor-mode-keymap';
import type { EditorModeKeymapOptions } from '../extensions/behavior/editor-mode-keymap';
import { History } from '../extensions/behavior/history';
import type { HistoryOptions } from '../extensions/behavior/history';
import { Placeholder } from '../extensions/behavior/placeholder';
import type { PlaceholderOptions } from '../extensions/behavior/placeholder';
import { Resizable } from '../extensions/behavior/resizable';
import { Selection } from '../extensions/behavior/selection';
import { SelectionContext } from '../extensions/behavior/selection-context';
import type { SelectionContextOptions } from '../extensions/behavior/selection-context';
import { Deflist } from '../extensions/markdown/deflist';
import { Mark } from '../extensions/markdown/mark';
import { Subscript } from '../extensions/markdown/subscript';
import { Underline } from '../extensions/markdown/underline';

import { DefaultPreset } from './default';
import type { DefaultPresetOptions } from './default';

export interface FullPresetOptions extends DefaultPresetOptions {
  cursor?: CursorOptions;
  editorModeKeymap?: EditorModeKeymapOptions;
  history?: HistoryOptions;
  placeholder?: PlaceholderOptions;
  selectionContext?: SelectionContextOptions;
}

/** Full preset restricted to the extensions included in the Vue port scope. */
export const FullPreset: ExtensionAuto<FullPresetOptions> = (builder, options) => {
  builder
    .use(DefaultPreset, options)
    .use(FoldingHeading)
    .use(Math)
    .use(Mermaid)
    .use(QuoteLink)
    .use(YfmHtmlBlock)
    .use(Deflist)
    .use(Mark)
    .use(Subscript)
    .use(Underline)
    .use(History, options.history ?? {})
    .use(Placeholder, options.placeholder ?? {})
    .use(Clipboard)
    .use(Cursor, options.cursor ?? {})
    .use(Selection)
    .use(ClicksOnEdges)
    .use(EditorModeKeymap, options.editorModeKeymap ?? {})
    .use(Resizable)
    .use(SelectionContext, options.selectionContext ?? {});
};
