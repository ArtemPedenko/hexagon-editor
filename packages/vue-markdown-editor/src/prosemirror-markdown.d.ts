import 'prosemirror-markdown';

declare module 'prosemirror-markdown' {
  interface MarkdownSerializerState {
    escapeWhitespace?: boolean;
    inAutolink?: boolean;
    quote(value: string): string;
  }
}
