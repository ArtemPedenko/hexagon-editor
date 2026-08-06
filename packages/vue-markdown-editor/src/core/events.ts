export type EventListener<Value> = (value: Value) => void;

type EventKey<Events extends object> = keyof Events;

/** A small typed event emitter used by the editor core and Vue integration. */
export class EventEmitter<Events extends object> {
    protected readonly listeners = new Map<EventKey<Events>, Set<EventListener<unknown>>>();

    on<Key extends EventKey<Events>>(type: Key, listener: EventListener<Events[Key]>): void {
        const listeners = this.listeners.get(type) ?? new Set<EventListener<unknown>>();
        listeners.add(listener as EventListener<unknown>);
        this.listeners.set(type, listeners);
    }

    off<Key extends EventKey<Events>>(type: Key, listener: EventListener<Events[Key]>): void {
        const listeners = this.listeners.get(type);
        if (listeners === undefined) {
            return;
        }

        listeners.delete(listener as EventListener<unknown>);
        if (listeners.size === 0) {
            this.listeners.delete(type);
        }
    }

    emit<Key extends EventKey<Events>>(type: Key, value: Events[Key]): void {
        const listeners = this.listeners.get(type);
        if (listeners === undefined) {
            return;
        }

        for (const listener of [...listeners]) {
            listener(value);
        }
    }

    clear(type?: EventKey<Events>): void {
        if (type === undefined) {
            this.listeners.clear();
            return;
        }

        this.listeners.delete(type);
    }

    listenerCount<Key extends EventKey<Events>>(type: Key): number {
        return this.listeners.get(type)?.size ?? 0;
    }
}

export interface SafeEventEmitterOptions {
    onError?(error: unknown): void;
}

/** Keeps one faulty subscriber from breaking an editor transaction. */
export class SafeEventEmitter<Events extends object> extends EventEmitter<Events> {
    readonly #onError: (error: unknown) => void;

    constructor(options: SafeEventEmitterOptions = {}) {
        super();
        this.#onError = options.onError ?? console.error;
    }

    override emit<Key extends EventKey<Events>>(type: Key, value: Events[Key]): void {
        const listeners = this.listeners.get(type);
        if (listeners === undefined) {
            return;
        }

        for (const listener of [...listeners]) {
            try {
                listener(value);
            } catch (error) {
                this.#onError(error);
            }
        }
    }
}

