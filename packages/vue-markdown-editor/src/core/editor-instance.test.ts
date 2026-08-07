import {describe, expect, it, vi} from 'vitest';

import {createMarkdownEditor} from './editor-instance';

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
        const editor = createMarkdownEditor({onFocus});

        editor.focus();

        expect(onFocus).toHaveBeenCalledExactlyOnceWith();
    });
});
