import {describe, expect, it, vi} from 'vitest';

import {Logger} from './logger';

describe('Logger', () => {
    it('adds nested context without mutating the original event payload', () => {
        const logger = new Logger();
        const listener = vi.fn();
        const payload = {event: 'mode-change', mode: 'markup'};

        logger.on('event', listener);
        logger.nested({editorId: 'first'}).event(payload);

        expect(listener).toHaveBeenCalledWith({editorId: 'first', ...payload});
        expect(payload).toEqual({event: 'mode-change', mode: 'markup'});
    });
});

