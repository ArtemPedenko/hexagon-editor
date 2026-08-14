import {ref} from 'vue';
import type {Ref} from 'vue';

interface ValueHost {
    setValue(value: string): void;
}

export interface MarkdownEditorValue {
    setExternalValue(value: string): void;
    setValue(value: string): void;
    updateFromHost(value: string, source: 'markup' | 'visual'): void;
    value: Ref<string>;
}

export function joinMarkdown(left: string, right: string): string {
    if (left.length === 0) return right;
    if (right.length === 0) return left;
    return `${left}\n\n${right}`;
}

export function useMarkdownEditorValue(options: {
    getMarkupHost: () => ValueHost | undefined;
    getVisualHost: () => ValueHost | undefined;
    initialValue: string;
    onChange: (value: string) => void;
}): MarkdownEditorValue {
    const value = ref(options.initialValue);
    let syncing = false;

    function syncHosts(nextValue: string, source?: 'markup' | 'visual'): void {
        syncing = true;
        if (source !== 'markup') options.getMarkupHost()?.setValue(nextValue);
        if (source !== 'visual') options.getVisualHost()?.setValue(nextValue);
        syncing = false;
    }

    function setExternalValue(nextValue: string): void {
        if (nextValue === value.value) return;
        value.value = nextValue;
        syncHosts(nextValue);
    }

    function setValue(nextValue: string): void {
        if (nextValue === value.value) return;
        value.value = nextValue;
        options.onChange(nextValue);
        syncHosts(nextValue);
    }

    function updateFromHost(nextValue: string, source: 'markup' | 'visual'): void {
        if (nextValue === value.value || syncing) return;
        value.value = nextValue;
        options.onChange(nextValue);
        syncHosts(nextValue, source);
    }

    return {setExternalValue, setValue, updateFromHost, value};
}
