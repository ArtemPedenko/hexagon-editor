export interface EditorAction<Arguments = undefined, Metadata = undefined> {
    isActive(): boolean;
    isEnabled(arguments_: Arguments): boolean;
    metadata(): Metadata;
    run(arguments_: Arguments): void;
}

export type EditorActions = Record<string, EditorAction<unknown, unknown>>;

/** Stores actions created by extensions without coupling them to a UI framework. */
export class ActionsManager<Actions extends EditorActions = EditorActions> {
    #actions: Actions;

    constructor(actions = {} as Actions) {
        this.#actions = actions;
    }

    get actions(): Readonly<Actions> {
        return this.#actions;
    }

    action<Key extends keyof Actions>(name: Key): Actions[Key] | undefined {
        return this.#actions[name];
    }

    setActions(actions: Actions): this {
        this.#actions = actions;
        return this;
    }
}

