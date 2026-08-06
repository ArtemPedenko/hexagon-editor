import {describe, expect, it, vi} from 'vitest';

import {EventEmitter, SafeEventEmitter} from './events';

interface Events {
    change: string;
    submit: undefined;
}

describe('EventEmitter', () => {
    it('notifies and removes typed listeners', () => {
        const emitter = new EventEmitter<Events>();
        const listener = vi.fn();

        emitter.on('change', listener);
        emitter.emit('change', 'value');
        emitter.off('change', listener);
        emitter.emit('change', 'ignored');

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith('value');
        expect(emitter.listenerCount('change')).toBe(0);
    });

    it('isolates a failing subscriber and continues with the next one', () => {
        const onError = vi.fn();
        const emitter = new SafeEventEmitter<Events>({onError});
        const succeedingListener = vi.fn();

        emitter.on('submit', () => {
            throw new Error('broken listener');
        });
        emitter.on('submit', succeedingListener);
        emitter.emit('submit', undefined);

        expect(onError).toHaveBeenCalledOnce();
        expect(succeedingListener).toHaveBeenCalledWith(undefined);
    });
});

