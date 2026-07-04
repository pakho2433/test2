import type { EventBus } from '../utils/EventBus';
import type { GameEvents } from '../core/Events';
import { HISTORY_FACTS } from '../data/historyFacts';

/** Tracks which optional historical information cards have been discovered. */
export class HistoryManager {
  private discovered = new Set<string>();

  constructor(private bus: EventBus<GameEvents>) {}

  discover(id: string): void {
    if (this.discovered.has(id)) return;
    if (!HISTORY_FACTS[id]) return;
    this.discovered.add(id);
    this.bus.emit('history-unlocked', { id });
  }

  isDiscovered(id: string): boolean {
    return this.discovered.has(id);
  }

  serialize(): string[] {
    return Array.from(this.discovered);
  }

  deserialize(data: string[] | undefined): void {
    if (!data) return;
    this.discovered = new Set(data.filter((id) => HISTORY_FACTS[id]));
  }
}
