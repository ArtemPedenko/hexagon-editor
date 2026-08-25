import type { Command, Plugin } from 'prosemirror-state';
import type { AppContext } from 'vue';

import type { MarkdownDirectiveComponents } from '../directives';
import type { SelectionContextOptions } from '../extensions/behavior/selection-context';
import type { ImageObjectFit } from '../extensions/markdown/image';
import type { TextColorName } from '../extensions/markdown/color';
import type { MarkdownFeatures } from '../public-types';

export interface BasicEditorCommands {
	addMathInline: Command;
	addTableColumn: Command;
	addTableRow: Command;
	bold: Command;
	bulletList: Command;
	code: Command;
	codeBlock: Command;
	setCodeBlockLanguage(language: string): Command;
	deleteTableColumn: Command;
	deleteTable: Command;
	deleteTableRow: Command;
	heading(level: number): Command;
	horizontalRule: Command;
	insertFile(href: string, name: string): Command;
	insertHtml: Command;
	insertImage(src: string, alt: string, title?: string): Command;
	setImageDisplay(width?: number | string, objectFit?: ImageObjectFit, height?: number | null): Command;
	insertMathBlock: Command;
	insertInlineMath: Command;
	insertMermaid: Command;
	insertTable(rows?: number, columns?: number): Command;
	italic: Command;
	liftListItem: Command;
	link(href: string): Command;
	removeLink: Command;
	setLink(href: string, title?: string, text?: string, openInNewWindow?: boolean): Command;
	mark: Command;
	orderedList: Command;
	paragraph: Command;
	quote: Command;
	redo: Command;
	setColor(color: TextColorName): Command;
	sinkListItem: Command;
	splitListItem: Command;
	strikethrough: Command;
	toMathBlock: Command;
	toggleHeadingFolding: Command;
	underline: Command;
	undo: Command;
}

export interface BasicWysiwygSelectionState {
	bold: boolean;
	bulletList: boolean;
	code: boolean;
	codeBlock: boolean;
	codeBlockLanguage: string | undefined;
	formula: boolean;
	headingFolded: boolean;
	headingLevel: number | undefined;
	image: boolean;
	imageObjectFit: string | undefined;
	italic: boolean;
	linkHref: string | undefined;
	linkOpenInNewWindow: boolean;
	linkText: string | undefined;
	listIndentEnabled: boolean;
	listOutdentEnabled: boolean;
	mark: boolean;
	mermaid: boolean;
	orderedList: boolean;
	quote: boolean;
	strikethrough: boolean;
	underline: boolean;
}

export interface BasicWysiwygEditor {
	destroy(): void;
	focus(): void;
	getValue(): string;
	hasFocus(): boolean;
	insert(markup: string): void;
	moveCursor(position: 'start' | 'end'): void;
	run(command: Command): boolean;
	selectElement(element: Element): void;
	setValue(value: string): void;
}

export interface MountBasicWysiwygEditorOptions {
	directiveAppContext?: AppContext;
	directiveComponents?: MarkdownDirectiveComponents;
	features?: MarkdownFeatures;
	editable?: boolean;
	initialValue?: string;
	onChange?(value: string): void;
	onCancel?(): boolean;
	onSelectionChange?(selection: BasicWysiwygSelectionState): void;
	onSubmit?(): boolean;
	placeholder?: string;
	plugins?: readonly Plugin[];
	selectionContext?: SelectionContextOptions;
	target: HTMLElement;
}
