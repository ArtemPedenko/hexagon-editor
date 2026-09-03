import type { Command, EditorState } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

import { DeflistNode, DeflistSpecs } from './deflist-specs';

export {
  DeflistAttr,
  DeflistNode,
  DeflistSpecs,
  deflistNodeSpecs,
  deflistSerializerNodes,
  deflistTokenSpecs,
} from './deflist-specs';

export function getDeflistTypes(schema: EditorState['schema']) {
  const list = schema.nodes[DeflistNode.List];
  const term = schema.nodes[DeflistNode.Term];
  const description = schema.nodes[DeflistNode.Desc];
  if (list === undefined || term === undefined || description === undefined) {
    throw new Error('Deflist extension requires dl, dt and dd nodes');
  }
  return { description, list, term };
}

/** Converts the current textblock to the first description of an upstream definition list. */
export const wrapToDeflist: Command = (state, dispatch) => {
  const { description, list, term } = getDeflistTypes(state.schema);
  const parent = state.selection.$from.parent;
  if (!parent.isTextblock) return false;
  const position = state.selection.$from.before();
  const replacement = list.create(null, [term.create(), description.create(null, parent.copy(parent.content))]);
  dispatch?.(state.tr.replaceWith(position, position + parent.nodeSize, replacement).scrollIntoView());
  return true;
};

/** The specialized upstream split behavior needs common parent-node utilities not yet ported. */
export const splitDeflist: Command = () => false;

export const Deflist: ExtensionAuto = (builder) => {
  builder.use(DeflistSpecs);
  builder.addKeymap(() => ({ Enter: splitDeflist }));
};
