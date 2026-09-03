import { chainCommands, exitCode } from 'prosemirror-commands';
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

import { BreakNodeName, BreaksSpecs } from './breaks-specs';

export {
  BreakNodeName,
  BreaksSpecs,
  breakTokenSpecs,
  hardBreakNodeSpec,
  serializeHardBreak,
  serializeSoftBreak,
  softBreakNodeSpec,
} from './breaks-specs';

export interface BreaksOptions {
  preferredBreak?: 'hard' | 'soft';
}

export const addBreak = (name: BreakNodeName): Command =>
  chainCommands(exitCode, (state, dispatch) => {
    const selection = state.selection;
    if (!(selection instanceof TextSelection) || selection.$cursor === null) return false;
    const paragraph = state.schema.nodes.paragraph;
    const breakType = state.schema.nodes[name];
    if (paragraph === undefined || breakType === undefined || selection.$cursor.parent.type !== paragraph) return false;
    if (isBreakNode(selection.$cursor.nodeBefore)) {
      if (dispatch === undefined) return true;
      const position = selection.$cursor.pos;
      const end = selection.$cursor.end();
      const after = selection.$cursor.after();
      const content = state.doc.slice(
        isBreakNode(selection.$cursor.nodeAfter) ? position + 1 : position,
        end,
        false,
      ).content;
      const transaction = state.tr
        .insert(after, paragraph.create(null, content))
        .setSelection(TextSelection.create(state.tr.doc, after + 1))
        .delete(position, end)
        .delete(position - 1, position);
      dispatch(transaction.scrollIntoView());
      return true;
    }
    dispatch?.(state.tr.replaceSelectionWith(breakType.create()).scrollIntoView());
    return true;
  });

export const Breaks: ExtensionAuto<BreaksOptions> = (builder, options) => {
  const preferredBreak = options?.preferredBreak ?? 'hard';
  builder.use(BreaksSpecs, { preferredBreak });
  builder.addKeymap(() => ({
    'Shift-Enter': addBreak(preferredBreak === 'soft' ? BreakNodeName.SoftBreak : BreakNodeName.HardBreak),
  }));
};

export function isBreakNode(node: ReturnType<EditorState['doc']['nodeAt']>): boolean {
  return node?.type.spec.isBreak === true;
}
