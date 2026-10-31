import { EventEmitter } from "node:events";
import type { MongoBackupEventMap, MongoBackupEventName } from "./types.js";

/**
 * Thin typed wrapper around Node's EventEmitter so consumers get compile-time
 * checked event names and payloads instead of `any`.
 */
export class TypedEventEmitter {
  private readonly emitter = new EventEmitter();

  on<E extends MongoBackupEventName>(
    event: E,
    listener: (payload: MongoBackupEventMap[E]) => void
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  off<E extends MongoBackupEventName>(
    event: E,
    listener: (payload: MongoBackupEventMap[E]) => void
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  once<E extends MongoBackupEventName>(
    event: E,
    listener: (payload: MongoBackupEventMap[E]) => void
  ): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  emit<E extends MongoBackupEventName>(event: E, payload: MongoBackupEventMap[E]): void {
    this.emitter.emit(event, payload);
  }
}
