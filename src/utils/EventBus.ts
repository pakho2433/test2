export type EventMap = Record<string, any>;

/** Minimal typed event bus used for decoupled cross-system communication. */
export class EventBus<T extends EventMap = EventMap> {
  private listeners: { [K in keyof T]?: Array<(payload: T[K]) => void> } = {};

  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): () => void {
    (this.listeners[event] ??= []).push(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void {
    const arr = this.listeners[event];
    if (!arr) return;
    const idx = arr.indexOf(handler);
    if (idx >= 0) arr.splice(idx, 1);
  }

  emit<K extends keyof T>(event: K, payload: T[K]): void {
    const arr = this.listeners[event];
    if (!arr) return;
    // copy to avoid mutation issues if a handler unsubscribes during emit
    [...arr].forEach((fn) => fn(payload));
  }
}
