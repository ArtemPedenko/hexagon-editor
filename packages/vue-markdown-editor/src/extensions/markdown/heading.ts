import { setBlockType } from 'prosemirror-commands';
import { textblockTypeInputRule } from 'prosemirror-inputrules';
import type { Command, EditorState } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

import { HeadingSpecs, headingLevelAttr, headingNodeName } from './heading-specs';

export {
  HeadingSpecs,
  headingLevelAttr,
  headingLineNumberAttr,
  headingNodeName,
  headingNodeSpec,
  headingTokenSpec,
  serializeHeading,
} from './heading-specs';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingOptions {
  h1Key?: string | null;
  h2Key?: string | null;
  h3Key?: string | null;
  h4Key?: string | null;
  h5Key?: string | null;
  h6Key?: string | null;
}

export function getHeadingType(schema: EditorState['schema']) {
  const heading = schema.nodes[headingNodeName];
  if (heading === undefined) throw new Error('Heading extension requires a heading node');
  return heading;
}

export const toHeading =
  (level: HeadingLevel): Command =>
  (state, dispatch, view) => {
    const parent = state.selection.$from.parent;
    if (parent.type === getHeadingType(state.schema) && parent.attrs[headingLevelAttr] === level) {
      const paragraph = state.schema.nodes.paragraph;
      return paragraph === undefined ? false : setBlockType(paragraph)(state, dispatch, view);
    }
    const attrs = parent.type === getHeadingType(state.schema) ? { ...parent.attrs } : {};
    attrs[headingLevelAttr] = level;
    return setBlockType(getHeadingType(state.schema), attrs)(state, dispatch, view);
  };

export const resetHeading: Command = (state, dispatch, view) => {
  const paragraph = state.schema.nodes.paragraph;
  if (
    !state.selection.empty ||
    paragraph === undefined ||
    state.selection.$from.parent.type !== getHeadingType(state.schema)
  ) {
    return false;
  }
  return view?.endOfTextblock('backward', state) === true ? setBlockType(paragraph)(state, dispatch, view) : false;
};

export const Heading: ExtensionAuto<HeadingOptions> = (builder, options) => {
  builder.use(HeadingSpecs);
  builder
    .addKeymap(() => ({
      Backspace: resetHeading,
      ...(options?.h1Key === undefined || options.h1Key === null ? {} : { [options.h1Key]: toHeading(1) }),
      ...(options?.h2Key === undefined || options.h2Key === null ? {} : { [options.h2Key]: toHeading(2) }),
      ...(options?.h3Key === undefined || options.h3Key === null ? {} : { [options.h3Key]: toHeading(3) }),
      ...(options?.h4Key === undefined || options.h4Key === null ? {} : { [options.h4Key]: toHeading(4) }),
      ...(options?.h5Key === undefined || options.h5Key === null ? {} : { [options.h5Key]: toHeading(5) }),
      ...(options?.h6Key === undefined || options.h6Key === null ? {} : { [options.h6Key]: toHeading(6) }),
    }))
    .addInputRules(({ schema }) => ({
      rules: [
        textblockTypeInputRule(/^(#{1,6})\s$/, getHeadingType(schema), (match) => ({
          [headingLevelAttr]: match[1]?.length,
        })),
      ],
    }));
};
