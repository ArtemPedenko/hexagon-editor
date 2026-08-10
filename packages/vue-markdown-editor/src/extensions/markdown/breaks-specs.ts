import type {NodeSpec, TagParseRule} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export enum BreakNodeName {
    HardBreak = 'hard_break',
    SoftBreak = 'soft_break',
}

export interface BreaksSpecsOptions {
    preferredBreak?: 'hard' | 'soft';
}

export const hardBreakNodeSpec: NodeSpec = createBreakNodeSpec();
export const softBreakNodeSpec: NodeSpec = createBreakNodeSpec();

export const breakTokenSpecs: Record<'hardbreak' | 'softbreak', ParseSpec> = {
    hardbreak: {node: BreakNodeName.HardBreak},
    softbreak: {node: BreakNodeName.SoftBreak},
};

export const serializeHardBreak: Parameters<typeof MarkdownSerializer>[0][string] = (state, node, parent, index) => {
    if (hasFollowingNonBreak(node.type.name, parent, index)) state.write('\\\n');
};

export const serializeSoftBreak: Parameters<typeof MarkdownSerializer>[0][string] = (state, node, parent, index) => {
    if (hasFollowingNonBreak(node.type.name, parent, index)) state.write('\n');
};

export const BreaksSpecs: ExtensionAuto<BreaksSpecsOptions> = (builder, options) => {
    const preferredBreak = options?.preferredBreak ?? 'hard';
    builder
        .addNodeSpec(BreakNodeName.HardBreak, () => ({
            ...hardBreakNodeSpec,
            parseDOM: preferredBreak === 'hard' ? [{tag: 'br'}] : undefined,
        }))
        .addNodeSpec(BreakNodeName.SoftBreak, () => ({
            ...softBreakNodeSpec,
            parseDOM: preferredBreak === 'soft' ? [{tag: 'br'}] : undefined,
        }))
        .addMarkdownTokenParserSpec('hardbreak', () => breakTokenSpecs.hardbreak)
        .addMarkdownTokenParserSpec('softbreak', () => breakTokenSpecs.softbreak)
        .addNodeSerializerSpec(BreakNodeName.HardBreak, () => serializeHardBreak)
        .addNodeSerializerSpec(BreakNodeName.SoftBreak, () => serializeSoftBreak);
};

function createBreakNodeSpec(): NodeSpec {
    const parseDOM: TagParseRule[] = [{tag: 'br'}];
    return {
        group: 'inline break',
        inline: true,
        isBreak: true,
        marks: '',
        parseDOM,
        selectable: false,
        toDOM: () => ['br'],
    };
}

function hasFollowingNonBreak(name: string, parent: Parameters<typeof serializeHardBreak>[2], index: number): boolean {
    for (let next = index + 1; next < parent.childCount; next += 1) {
        if (parent.child(next).type.name !== name) return true;
    }
    return false;
}

declare module 'prosemirror-model' {
    interface NodeSpec {
        isBreak?: boolean | undefined;
    }
}
