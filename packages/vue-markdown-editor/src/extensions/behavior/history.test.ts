import { undoDepth } from 'prosemirror-history';
import { EditorState } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';
import { createHistoryActions, History } from './history';

describe('History extension', () => {
  it('registers history state and optional shortcut keymap', () => {
    const plugins = ExtensionsManager.plugins(
      (builder) => builder.use(History, { undoKey: 'Mod-z' }),
      basicMarkdownSchema,
    );
    const state = EditorState.create({ plugins, schema: basicMarkdownSchema });

    expect(plugins).toHaveLength(2);
    expect(undoDepth(state)).toBe(0);
  });

  it('exposes toolbar commands with upstream action names', () => {
    expect(Object.keys(createHistoryActions())).toEqual(['redo', 'undo']);
  });
});
