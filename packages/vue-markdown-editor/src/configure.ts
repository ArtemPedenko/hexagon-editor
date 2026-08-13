import {configureAdvancedMarkdownRenderers} from './core/optional-renderers';
import type {AdvancedMarkdownRenderers} from './core/optional-renderers';

export enum Lang {
    Ru = 'ru',
    En = 'en',
}

export interface MarkdownEditorConfig {
    lang?: `${Lang}`;
    renderers?: AdvancedMarkdownRenderers;
}

export type ConfigureSubscriber = (config: Readonly<MarkdownEditorConfig>) => void;

const config: MarkdownEditorConfig = {};
const subscribers = new Set<ConfigureSubscriber>();

/** Configures process-wide defaults shared by editor instances. */
export function configure(nextConfig: MarkdownEditorConfig): void {
    Object.assign(config, nextConfig);
    if (nextConfig.renderers !== undefined) configureAdvancedMarkdownRenderers(nextConfig.renderers);
    for (const subscriber of [...subscribers]) subscriber(config);
}

export function getConfig(): Readonly<MarkdownEditorConfig> {
    return config;
}

export function subscribeConfigure(subscriber: ConfigureSubscriber): () => void {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
}
