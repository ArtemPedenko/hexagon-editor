import { indentLess, indentMore, redo, undo } from '@codemirror/commands';
import type { EditorView } from '@codemirror/view';

import { defaultMathLatex } from '../extensions/additional/math';
import { defaultMermaidSource } from '../extensions/additional/mermaid';

export type MarkupCommand = (view: EditorView) => boolean;

export interface BasicMarkupCommands {
  bold: MarkupCommand;
  bulletList: MarkupCommand;
  code: MarkupCommand;
  codeBlock: MarkupCommand;
  heading(level: number): MarkupCommand;
  horizontalRule: MarkupCommand;
  indentList: MarkupCommand;
  insertHtml: MarkupCommand;
  insertImage(src: string, alt: string, title?: string): MarkupCommand;
  insertInlineMath: MarkupCommand;
  insertMathBlock: MarkupCommand;
  insertMermaid: MarkupCommand;
  insertTable(rows?: number, columns?: number): MarkupCommand;
  italic: MarkupCommand;
  mark: MarkupCommand;
  orderedList: MarkupCommand;
  outdentList: MarkupCommand;
  paragraph: MarkupCommand;
  quote: MarkupCommand;
  redo: MarkupCommand;
  setLink(href: string, title?: string, text?: string, openInNewWindow?: boolean): MarkupCommand;
  strikethrough: MarkupCommand;
  toggleHeadingFolding: MarkupCommand;
  underline: MarkupCommand;
  undo: MarkupCommand;
}

function wrap(open: string, close = open): MarkupCommand {
  return (view) => {
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc;
    const selected = doc.sliceString(from, to);

    const beforeFrom = Math.max(0, from - open.length);
    const afterTo = Math.min(doc.length, to + close.length);

    const before = doc.sliceString(beforeFrom, from);
    const after = doc.sliceString(to, afterTo);

    if (selected.length > 0 && before === open && after === close) {
      view.dispatch({
        changes: [
          {
            from: beforeFrom,
            to: from,
            insert: '',
          },
          {
            from: to,
            to: afterTo,
            insert: '',
          },
        ],
        selection: {
          anchor: beforeFrom,
          head: to - open.length,
        },
      });

      return true;
    }

    const inserted = `${open}${selected}${close}`;

    view.dispatch({
      changes: {
        from,
        to,
        insert: inserted,
      },
      selection:
        selected.length > 0
          ? {
              anchor: from + open.length,
              head: from + open.length + selected.length,
            }
          : {
              anchor: from + open.length,
            },
      scrollIntoView: true,
    });

    return true;
  };
}

function replaceSelectedLines(view: EditorView, transform: (line: string, index: number) => string): boolean {
  const selection = view.state.selection.main;
  const { from, to } = selection;
  const doc = view.state.doc;

  const firstLine = doc.lineAt(from);

  let endPosition = to;

  if (to > from) {
    const endLine = doc.lineAt(to);

    if (endLine.from === to) {
      endPosition = to - 1;
    }
  }

  const lastLine = doc.lineAt(Math.max(from, endPosition));

  const sourceLines = doc.sliceString(firstLine.from, lastLine.to).split('\n');
  const resultLines = sourceLines.map(transform);
  const result = resultLines.join('\n');

  function mapPosition(position: number): number {
    const line = doc.lineAt(position);
    const lineIndex = Math.min(line.number - firstLine.number, sourceLines.length - 1);
    const sourceLine = sourceLines[lineIndex] ?? '';
    const resultLine = resultLines[lineIndex] ?? '';
    const column = Math.min(position - line.from, sourceLine.length);

    let commonPrefix = 0;
    while (
      commonPrefix < sourceLine.length &&
      commonPrefix < resultLine.length &&
      sourceLine[commonPrefix] === resultLine[commonPrefix]
    )
      commonPrefix += 1;

    let commonSuffix = 0;
    while (
      commonSuffix < sourceLine.length - commonPrefix &&
      commonSuffix < resultLine.length - commonPrefix &&
      sourceLine[sourceLine.length - commonSuffix - 1] === resultLine[resultLine.length - commonSuffix - 1]
    )
      commonSuffix += 1;

    let mappedColumn: number;
    if (sourceLine.length === 0) mappedColumn = resultLine.length;
    else if (commonSuffix > 0 && column >= sourceLine.length - commonSuffix) {
      mappedColumn = resultLine.length - (sourceLine.length - column);
    } else if (column <= commonPrefix) mappedColumn = column;
    else mappedColumn = Math.min(commonPrefix, resultLine.length);

    const precedingLength = resultLines.slice(0, lineIndex).reduce((length, value) => length + value.length + 1, 0);
    return firstLine.from + precedingLength + mappedColumn;
  }

  view.dispatch({
    changes: {
      from: firstLine.from,
      to: lastLine.to,
      insert: result,
    },
    selection: {
      anchor: mapPosition(selection.anchor),
      head: mapPosition(selection.head),
    },
    scrollIntoView: true,
  });

  return true;
}

function toggleBulletList(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;

  const first = doc.lineAt(from);
  const last = doc.lineAt(Math.max(from, to));

  const source = doc.sliceString(first.from, last.to);
  const lines = source.split('\n');

  const allBullet = lines.every((line) => /^\s*[-*+]\s+/.test(line));

  return replaceSelectedLines(view, (line) => {
    if (allBullet) {
      return line.replace(/^(\s*)[-*+]\s+/, '$1');
    }

    const match = line.match(/^(\s*)/);
    const indent = match?.[1] ?? '';

    const content = line.slice(indent.length).replace(/^(?:[-*+]|\d+[.)])\s+/, '');

    return `${indent}* ${content}`;
  });
}

function toggleOrderedList(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;

  const first = doc.lineAt(from);
  const last = doc.lineAt(Math.max(from, to));

  const source = doc.sliceString(first.from, last.to);
  const lines = source.split('\n');

  const allOrdered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));

  return replaceSelectedLines(view, (line, index) => {
    if (allOrdered) {
      return line.replace(/^(\s*)\d+[.)]\s+/, '$1');
    }

    const match = line.match(/^(\s*)/);
    const indent = match?.[1] ?? '';

    const content = line.slice(indent.length).replace(/^(?:[-*+]|\d+[.)])\s+/, '');

    return `${indent}${index + 1}. ${content}`;
  });
}

function toggleQuote(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const doc = view.state.doc;

  const first = doc.lineAt(from);
  const last = doc.lineAt(Math.max(from, to));

  const source = doc.sliceString(first.from, last.to);

  const allQuoted = source.split('\n').every((line) => /^\s*>\s?/.test(line));

  return replaceSelectedLines(view, (line) => {
    if (allQuoted) {
      return line.replace(/^(\s*)>\s?/, '$1');
    }

    return `> ${line}`;
  });
}

function setHeading(level: number): MarkupCommand {
  return (view) =>
    replaceSelectedLines(view, (line) => {
      const content = line.replace(/^#{1,6}\+?\s+/, '');

      return `${'#'.repeat(level)} ${content}`;
    });
}

const setParagraph: MarkupCommand = (view) => replaceSelectedLines(view, (line) => line.replace(/^#{1,6}\+?\s+/, ''));

const toggleHeadingFolding: MarkupCommand = (view) =>
  replaceSelectedLines(view, (line) => {
    const match = line.match(/^(#{1,6})(\+)?\s+(.*)$/);

    if (!match) {
      return line;
    }

    const [, hashes, folding, content] = match;

    return `${hashes}${folding ? '' : '+'} ${content}`;
  });

const toggleCodeBlock: MarkupCommand = (view) => {
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to);

  if (selected.startsWith('```') && selected.endsWith('```')) {
    const content = selected.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');

    view.dispatch({
      changes: {
        from,
        to,
        insert: content,
      },
      selection: {
        anchor: from,
        head: from + content.length,
      },
    });

    return true;
  }

  const content = selected || '';

  const result = `\`\`\`\n${content}\n\`\`\``;

  view.dispatch({
    changes: {
      from,
      to,
      insert: result,
    },
    selection: content
      ? {
          anchor: from + 4,
          head: from + 4 + content.length,
        }
      : {
          anchor: from + 4,
        },
    scrollIntoView: true,
  });

  return true;
};

function insertBlock(markup: string): MarkupCommand {
  return (view) => {
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc;

    const before = doc.sliceString(0, from);
    const after = doc.sliceString(to);

    const prefix = from === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';

    const suffix = to === doc.length ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';

    const inserted = `${prefix}${markup}${suffix}`;

    view.dispatch({
      changes: {
        from,
        to,
        insert: inserted,
      },
      selection: {
        anchor: from + prefix.length + markup.length,
      },
      scrollIntoView: true,
    });

    return true;
  };
}

function insertLink(href: string, title?: string, text?: string, openInNewWindow = false): MarkupCommand {
  return (view) => {
    const { from, to } = view.state.selection.main;

    const selected = view.state.doc.sliceString(from, to);

    const label = text?.trim() || selected || href;

    const escapedHref = href.replaceAll(/[()]/g, (character) => `\\${character}`);

    const titlePart = title && title !== label ? ` "${title.replaceAll('"', '\\"')}"` : '';

    const external = openInNewWindow ? ' {target="_blank" rel="noopener noreferrer"}' : '';

    const markup = `[${label}](${escapedHref}${titlePart})${external}`;

    view.dispatch({
      changes: {
        from,
        to,
        insert: markup,
      },
      selection: {
        anchor: from,
        head: from + markup.length,
      },
      scrollIntoView: true,
    });

    return true;
  };
}

function insertImage(src: string, alt: string, title?: string): MarkupCommand {
  const titlePart = title ? ` "${title.replaceAll('"', '\\"')}"` : '';

  return insertBlock(`![${alt}](${src}${titlePart})`);
}

function insertTable(rows = 2, columns = 2): MarkupCommand {
  const columnCount = Math.max(1, columns);
  const rowCount = Math.max(1, rows);

  const header = `| ${Array(columnCount).fill(' ').join(' | ')} |`;

  const separator = `| ${Array(columnCount).fill('---').join(' | ')} |`;

  const body = Array(rowCount)
    .fill(null)
    .map(() => `| ${Array(columnCount).fill(' ').join(' | ')} |`)
    .join('\n');

  return insertBlock(`${header}\n${separator}\n${body}`);
}

export function createBasicMarkupCommands(): BasicMarkupCommands {
  return {
    bold: wrap('**'),
    bulletList: toggleBulletList,
    code: wrap('`'),
    codeBlock: toggleCodeBlock,

    heading: setHeading,

    horizontalRule: insertBlock('---'),

    indentList: (view) => indentMore(view),
    outdentList: (view) => indentLess(view),

    insertHtml: insertBlock(['::: html', '<div>Add HTML code here</div>', ':::'].join('\n')),

    insertImage,

    insertInlineMath: wrap('$'),

    insertMathBlock: insertBlock(['$$', defaultMathLatex, '$$'].join('\n')),

    insertMermaid: insertBlock(['```mermaid', defaultMermaidSource, '```'].join('\n')),

    insertTable,

    italic: wrap('*'),

    mark: wrap('=='),

    orderedList: toggleOrderedList,

    paragraph: setParagraph,

    quote: toggleQuote,

    redo: (view) => redo(view),

    setLink: insertLink,

    strikethrough: wrap('~~'),

    toggleHeadingFolding,

    underline: wrap('++'),

    undo: (view) => undo(view),
  };
}
