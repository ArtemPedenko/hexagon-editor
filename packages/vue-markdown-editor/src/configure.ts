export enum Lang {
    Ru = 'ru',
    En = 'en',
}

export interface MarkdownEditorConfig {
    lang?: `${Lang}`;
}

export type ConfigureSubscriber = (config: Readonly<MarkdownEditorConfig>) => void;

const config: MarkdownEditorConfig = {};
const subscribers = new Set<ConfigureSubscriber>();

/** Configures process-wide defaults shared by editor instances. */
export function configure(nextConfig: MarkdownEditorConfig): void {
    Object.assign(config, nextConfig);
    for (const subscriber of [...subscribers]) subscriber(config);
}

export function getConfig(): Readonly<MarkdownEditorConfig> {
    return config;
}

export function subscribeConfigure(subscriber: ConfigureSubscriber): () => void {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
}
