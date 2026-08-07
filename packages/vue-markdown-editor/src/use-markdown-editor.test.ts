import {describe, expect, it} from 'vitest';

import {useMarkdownEditor} from './use-markdown-editor';

describe('useMarkdownEditor', () => {
    it('keeps readonly Vue refs synchronized with the editor', () => {
        const {destroy, editor, mode, value} = useMarkdownEditor({initialValue: '# Initial'});

        editor.setValue('# Updated');
        editor.setMode('split');

        expect(value.value).toBe('# Updated');
        expect(mode.value).toBe('split');
        destroy();
        expect(() => editor.setValue('after destroy')).toThrow('destroyed');
    });
});
