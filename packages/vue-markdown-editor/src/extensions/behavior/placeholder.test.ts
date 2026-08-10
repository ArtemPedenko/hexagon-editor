import {EditorState} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';
import {Placeholder} from './placeholder';

describe('Placeholder extension', () => {
    it('exposes placeholder content through ProseMirror view attributes', () => {
        const [plugin] = ExtensionsManager.plugins(
            (builder) => builder.use(Placeholder, {content: 'Start typing'}),
            basicMarkdownSchema,
        );
        const state = EditorState.create({plugins: [plugin!], schema: basicMarkdownSchema});

        expect(plugin?.props.attributes?.(state)).toEqual({'data-placeholder': 'Start typing'});
    });
});
