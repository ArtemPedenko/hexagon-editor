import {describe, expect, it} from 'vitest';

import {useMarkdownEditor} from './use-markdown-editor';

describe('useMarkdownEditor', () => {
    it('keeps readonly Vue refs synchronized with the editor', () => {
        const {destroy, editor, mode, readonly, toolbarVisible, value} = useMarkdownEditor({initialValue: '# Initial'});

        editor.setValue('# Updated');
        editor.setMode('split');
        editor.setReadonly(true);
        editor.changeToolbarVisibility({visible: false});

        expect(value.value).toBe('# Updated');
        expect(mode.value).toBe('split');
        expect(readonly.value).toBe(true);
        expect(toolbarVisible.value).toBe(false);
        destroy();
        expect(() => editor.setValue('after destroy')).toThrow('destroyed');
    });
});
