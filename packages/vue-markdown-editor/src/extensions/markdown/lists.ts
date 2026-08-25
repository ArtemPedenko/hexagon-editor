import { liftListItem, splitListItem } from 'prosemirror-schema-list';
import type { Command } from 'prosemirror-state';
import type { Schema } from 'prosemirror-model';

import type { ExtensionAuto } from '../../core/extension-builder';
import {
	collapseListsPlugin,
	createListsInputRules,
	joinPrevList,
	mergeListsPlugin,
	sinkOnlySelectedListItem,
	toList,
} from '../../core/lists';

export interface ListsOptions {
	olKey?: string | null;
	ulKey?: string | null;
}

export interface ListActions {
	liftListItem: Command;
	sinkListItem: Command;
	toBulletList: Command;
	toOrderedList: Command;
}

/** Upstream list action factories for toolbar/preset consumers. */
export function createListActions(schema: Schema): ListActions {
	const listItem = schema.nodes.list_item;
	const bulletList = schema.nodes.bullet_list;
	const orderedList = schema.nodes.ordered_list;
	if (listItem === undefined || bulletList === undefined || orderedList === undefined) {
		throw new Error('Lists actions require list_item, bullet_list and ordered_list nodes');
	}
	return {
		liftListItem: liftListItem(listItem),
		sinkListItem: sinkOnlySelectedListItem(listItem),
		toBulletList: toList(bulletList),
		toOrderedList: toList(orderedList),
	};
}

/** Upstream Lists extension registration, independent from the Vue view layer. */
export const Lists: ExtensionAuto<ListsOptions> = (builder, options) => {
	builder.addKeymap(({ schema }) => {
		const listItem = schema.nodes.list_item;
		const bulletList = schema.nodes.bullet_list;
		const orderedList = schema.nodes.ordered_list;
		if (listItem === undefined || bulletList === undefined || orderedList === undefined) {
			throw new Error('Lists extension requires list_item, bullet_list and ordered_list nodes');
		}
		const bindings: Record<string, ReturnType<typeof liftListItem>> = {};
		if (options?.ulKey !== null && options?.ulKey !== undefined) bindings[options.ulKey] = toList(bulletList);
		if (options?.olKey !== null && options?.olKey !== undefined) bindings[options.olKey] = toList(orderedList);
		return {
			'Mod-[': liftListItem(listItem),
			'Mod-]': sinkOnlySelectedListItem(listItem),
			'Shift-Tab': liftListItem(listItem),
			Tab: sinkOnlySelectedListItem(listItem),
			...bindings,
		};
	}, builder.Priority.High);
	builder.addKeymap(({ schema }) => {
		const listItem = schema.nodes.list_item;
		if (listItem === undefined) throw new Error('Lists extension requires list_item node');
		return { Backspace: joinPrevList, Enter: splitListItem(listItem) };
	}, builder.Priority.Low);
	builder.addPlugin(({ schema }) => createListsInputRules(schema));
	builder.addPlugin(mergeListsPlugin);
	builder.addPlugin(collapseListsPlugin);
};
