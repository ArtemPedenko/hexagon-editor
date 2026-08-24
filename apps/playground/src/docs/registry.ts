import accessibility from './accessibility.md?raw';
import configuration from './configuration.md?raw';
import coreSubpaths from './core-subpaths.md?raw';
import directives from './directives.md?raw';
import editorApi from './editor-api.md?raw';
import editorModes from './editor-modes.md?raw';
import extendedMarkdown from './extended-markdown.md?raw';
import gettingStarted from './getting-started.md?raw';
import headless from './headless.md?raw';
import images from './images.md?raw';
import katexMermaid from './katex-mermaid.md?raw';
import markdownEssentials from './markdown-essentials.md?raw';
import presetsExtensions from './presets-extensions.md?raw';
import rendererSsr from './renderer-ssr.md?raw';
import toolbar from './toolbar.md?raw';

export interface DocPage {
    slug: string;
    title: string;
    group: string;
    description: string;
    content: string;
}

export const docPages: readonly DocPage[] = [
    {slug: 'getting-started', title: 'Getting started', group: 'Basics', description: 'Install the editor and render your first Markdown document.', content: gettingStarted},
    {slug: 'editor-api', title: 'Editor component API', group: 'Basics', description: 'Use every prop, event, slot, and TypeScript contract.', content: editorApi},
    {slug: 'editor-modes', title: 'Modes, state, and component ref', group: 'Basics', description: 'Control visual, markup, and split editing programmatically.', content: editorModes},
    {slug: 'markdown-essentials', title: 'Markdown essentials', group: 'Content', description: 'Write portable documents with the core Markdown syntax.', content: markdownEssentials},
    {slug: 'extended-markdown', title: 'Extended Markdown and YFM', group: 'Content', description: 'Use tables, definitions, folding sections, and YFM syntax.', content: extendedMarkdown},
    {slug: 'images', title: 'Images, uploads, and forms', group: 'Content', description: 'Insert, upload, resize, and collect image and link data.', content: images},
    {slug: 'renderer-ssr', title: 'Renderer, SSR, and styling', group: 'Rendering', description: 'Render Markdown in previews and server applications.', content: rendererSsr},
    {slug: 'katex-mermaid', title: 'KaTeX, Mermaid, and trusted HTML', group: 'Rendering', description: 'Connect optional engines and define the HTML trust boundary.', content: katexMermaid},
    {slug: 'toolbar', title: 'Toolbar customization', group: 'Customization', description: 'Choose presets or build ordered, contextual toolbar actions.', content: toolbar},
    {slug: 'directives', title: 'Custom directives', group: 'Customization', description: 'Turn named Markdown blocks into Vue components.', content: directives},
    {slug: 'headless', title: 'Headless API', group: 'Integration', description: 'Own editor state, events, actions, and lifecycle without component UI.', content: headless},
    {slug: 'presets-extensions', title: 'Presets, extensions, and specs', group: 'Integration', description: 'Compose schemas and behavior with supported extension bundles.', content: presetsExtensions},
    {slug: 'core-subpaths', title: 'Core and public subpaths', group: 'Integration', description: 'Use codecs, basic editors, registries, commands, and Vue helpers.', content: coreSubpaths},
    {slug: 'configuration', title: 'Configuration, i18n, and class names', group: 'Integration', description: 'Set global language defaults and use stable utility entry points.', content: configuration},
    {slug: 'accessibility', title: 'Accessibility and responsive behavior', group: 'Guidance', description: 'Ship an inclusive editor across keyboards, touch, and small screens.', content: accessibility},
];

export const docGroups: readonly string[] = [...new Set(docPages.map((page) => page.group))];

export function findDocPage(slug: string | undefined): DocPage {
    return docPages.find((page) => page.slug === slug) ?? docPages[0]!;
}
