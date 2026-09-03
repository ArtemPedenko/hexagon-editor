import { describe, expect, it, vi } from 'vitest';

import { createMarkdownEditor } from './editor-instance';

describe('MarkdownEditor', () => {
  it('emits value and mode changes only when they change', () => {
    const onChange = vi.fn();
    const onModeChange = vi.fn();
    const editor = createMarkdownEditor({
      initialValue: '# Initial',
      mode: 'markup',
      onChange,
      onModeChange,
    });

    editor.setValue('# Initial');
    editor.setMode('markup');
    editor.setValue('# Updated');
    editor.setMode('split');

    expect(editor.getValue()).toBe('# Updated');
    expect(editor.getMode()).toBe('split');
    expect(onChange).toHaveBeenCalledExactlyOnceWith('# Updated');
    expect(onModeChange).toHaveBeenCalledExactlyOnceWith('split');
  });

  it('removes subscriptions and rejects calls after destroy', () => {
    const listener = vi.fn();
    const editor = createMarkdownEditor();

    editor.on('change', listener);
    editor.off('change', listener);
    editor.setValue('Ignored listener');
    editor.destroy();

    expect(listener).not.toHaveBeenCalled();
    expect(() => editor.setMode('markup')).toThrow('destroyed');
    expect(() => editor.on('change', listener)).toThrow('destroyed');
  });

  it('delegates focus to the configured host callback', () => {
    const onFocus = vi.fn();
    const editor = createMarkdownEditor({ onFocus });

    editor.focus();

    expect(onFocus).toHaveBeenCalledExactlyOnceWith();
  });

  it('supports the upstream common editor value operations', () => {
    const editor = createMarkdownEditor({ initial: { markup: 'middle' } });

    editor.prepend('first');
    editor.append('last');
    editor.insert('inserted');
    expect(editor.getValue()).toBe('first\n\nmiddle\n\nlast\n\ninserted');
    expect(editor.isEmpty()).toBe(false);
    editor.clear();
    expect(editor.isEmpty()).toBe(true);
    editor.replace('replacement');
    expect(editor.getValue()).toBe('replacement');
  });

  it('controls mode, readonly and toolbar state with public events', () => {
    const beforeEditorModeChange = vi.fn(({ reason }) => reason !== 'settings');
    const editor = createMarkdownEditor({
      beforeEditorModeChange,
      initial: { readonly: true, toolbarVisible: false },
    });
    const modeChange = vi.fn();
    const readonlyChange = vi.fn();
    const toolbarChange = vi.fn();
    editor.on('changeEditorMode', modeChange);
    editor.on('changeReadonly', readonlyChange);
    editor.on('changeToolbarVisibility', toolbarChange);

    editor.changeEditorMode({ mode: 'markup', reason: 'settings' });
    expect(editor.currentMode).toBe('wysiwyg');
    editor.setEditorMode('split');
    editor.setReadonly(false);
    editor.changeToolbarVisibility({ visible: true });

    expect(editor.currentMode).toBe('split');
    expect(editor.readonly).toBe(false);
    expect(editor.toolbarVisible).toBe(true);
    expect(modeChange).toHaveBeenCalledExactlyOnceWith({
      emit: true,
      mode: 'split',
      reason: 'manually',
    });
    expect(readonlyChange).toHaveBeenCalledExactlyOnceWith({ readonly: false });
    expect(toolbarChange).toHaveBeenCalledExactlyOnceWith({ visible: true });
  });

  it('delegates focus state and cursor movement to the active host', () => {
    const onMoveCursor = vi.fn();
    const editor = createMarkdownEditor({
      onHasFocus: () => true,
      onMoveCursor,
    });

    expect(editor.hasFocus()).toBe(true);
    editor.moveCursor({ line: 3 });
    expect(onMoveCursor).toHaveBeenCalledExactlyOnceWith({ line: 3 });
  });

  it('exposes host-bound actions through the public action storage', () => {
    const bold = {
      isActive: () => false,
      isEnabled: () => true,
      metadata: () => undefined,
      run: vi.fn(),
    };
    const editor = createMarkdownEditor({ actions: { bold } });

    expect(editor.actions.bold).toBe(bold);
    editor.action('bold')?.run(undefined);
    expect(bold.run).toHaveBeenCalledOnce();
  });
});
