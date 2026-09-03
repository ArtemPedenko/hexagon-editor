import { type EventListener, type SafeEventEmitterOptions, SafeEventEmitter } from './events';

export type LogContext = Readonly<Record<string, unknown>>;

export interface EditorLogEventMap {
  action: LogContext;
  error: LogContext & { error: unknown };
  event: LogContext & { event: string };
  log: LogContext & { message: string };
  metrics: LogContext;
  warn: LogContext & { message: string };
}

export interface EditorLogger {
  action(data: LogContext): void;
  error(error: unknown, data?: LogContext): void;
  event(data: EditorLogEventMap['event']): void;
  log(message: string, data?: LogContext): void;
  metrics(data: LogContext): void;
  nested(context: LogContext): EditorLogger;
  off<Key extends keyof EditorLogEventMap>(type: Key, listener: EventListener<EditorLogEventMap[Key]>): void;
  on<Key extends keyof EditorLogEventMap>(type: Key, listener: EventListener<EditorLogEventMap[Key]>): void;
  warn(message: string, data?: LogContext): void;
}

/** Event-driven logger. Applications decide whether and where to persist its events. */
export class Logger implements EditorLogger {
  readonly #emitter: SafeEventEmitter<EditorLogEventMap>;

  constructor(options: SafeEventEmitterOptions = {}) {
    this.#emitter = new SafeEventEmitter(options);
  }

  log(message: string, data: LogContext = {}): void {
    this.#emitter.emit('log', { ...data, message });
  }

  warn(message: string, data: LogContext = {}): void {
    this.#emitter.emit('warn', { ...data, message });
  }

  error(error: unknown, data: LogContext = {}): void {
    this.#emitter.emit('error', { ...data, error });
  }

  event(data: EditorLogEventMap['event']): void {
    this.#emitter.emit('event', data);
  }

  action(data: LogContext): void {
    this.#emitter.emit('action', data);
  }

  metrics(data: LogContext): void {
    this.#emitter.emit('metrics', data);
  }

  nested(context: LogContext): EditorLogger {
    return new NestedLogger(this, context);
  }

  on<Key extends keyof EditorLogEventMap>(type: Key, listener: EventListener<EditorLogEventMap[Key]>): void {
    this.#emitter.on(type, listener);
  }

  off<Key extends keyof EditorLogEventMap>(type: Key, listener: EventListener<EditorLogEventMap[Key]>): void {
    this.#emitter.off(type, listener);
  }
}

class NestedLogger implements EditorLogger {
  constructor(
    private readonly logger: EditorLogger,
    private readonly context: LogContext,
  ) {}

  log(message: string, data: LogContext = {}): void {
    this.logger.log(message, this.withContext(data));
  }

  warn(message: string, data: LogContext = {}): void {
    this.logger.warn(message, this.withContext(data));
  }

  error(error: unknown, data: LogContext = {}): void {
    this.logger.error(error, this.withContext(data));
  }

  event(data: EditorLogEventMap['event']): void {
    this.logger.event(this.withContext(data) as EditorLogEventMap['event']);
  }

  action(data: LogContext): void {
    this.logger.action(this.withContext(data));
  }

  metrics(data: LogContext): void {
    this.logger.metrics(this.withContext(data));
  }

  nested(context: LogContext): EditorLogger {
    return new NestedLogger(this.logger, this.withContext(context));
  }

  on<Key extends keyof EditorLogEventMap>(type: Key, listener: EventListener<EditorLogEventMap[Key]>): void {
    this.logger.on(type, listener);
  }

  off<Key extends keyof EditorLogEventMap>(type: Key, listener: EventListener<EditorLogEventMap[Key]>): void {
    this.logger.off(type, listener);
  }

  private withContext(data: LogContext): LogContext {
    return { ...this.context, ...data };
  }
}

/** Compatibility alias retained while migrating the original public API. */
export { Logger as Logger2 };
