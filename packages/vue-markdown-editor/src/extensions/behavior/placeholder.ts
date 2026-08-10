import {Plugin} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

export interface PlaceholderOptions {
    content?: string;
}

/**
 * Vue adaptation of upstream Placeholder registration. BaseSchema does not
 * expose per-node placeholder metadata yet, so this preserves the current
 * document-level placeholder contract through ProseMirror view attributes.
 */
export const Placeholder: ExtensionAuto<PlaceholderOptions> = (builder, options) => {
    builder.addPlugin(() => new Plugin({
        props: {
            attributes: () => options?.content === undefined || options.content.length === 0
                ? {}
                : {'data-placeholder': options.content},
        },
    }), builder.Priority.VeryHigh);
};
