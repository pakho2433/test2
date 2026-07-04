import type { EventBus } from '../utils/EventBus';
import type { GameEvents } from '../core/Events';
import { QUESTS, type QuestDef } from '../data/quests';
import type { InventoryManager } from '../inventory/InventoryManager';

export type QuestStatus = 'unavailable' | 'available' | 'active' | 'completed';

export interface QuestRuntimeState {
  status: QuestStatus;
  objectiveIndex: number;
  counters: Record<string, number>;
}

/**
 * Drives quest state for the main mission (「失蹤的商業帳簿」) and all side
 * missions: available -> accepted -> active objectives -> progress ->
 * completed -> rewards, with HUD + dialogue reactivity.
 */
export class QuestManager {
  private state = new Map<string, QuestRuntimeState>();

  constructor(private bus: EventBus<GameEvents>, private inventory: InventoryManager) {
    Object.keys(QUESTS).forEach((id) => {
      this.state.set(id, { status: 'available', objectiveIndex: 0, counters: {} });
    });
  }

  getDef(id: string): QuestDef {
    return QUESTS[id];
  }

  getState(id: string): QuestRuntimeState {
    return this.state.get(id) ?? { status: 'unavailable', objectiveIndex: 0, counters: {} };
  }

  getAllStates(): Map<string, QuestRuntimeState> {
    return this.state;
  }

  isActive(id: string): boolean {
    return this.getState(id).status === 'active';
  }

  isCompleted(id: string): boolean {
    return this.getState(id).status === 'completed';
  }

  currentObjectiveId(questId: string): string | null {
    const s = this.getState(questId);
    const def = QUESTS[questId];
    if (s.status !== 'active') return null;
    return def.objectives[s.objectiveIndex]?.id ?? null;
  }

  isObjectiveCurrent(questId: string, objectiveId: string): boolean {
    return this.currentObjectiveId(questId) === objectiveId;
  }

  startQuest(id: string): void {
    const s = this.getState(id);
    if (s.status !== 'available') return;
    s.status = 'active';
    s.objectiveIndex = 0;
    this.state.set(id, s);
    this.bus.emit('quest-updated', { questId: id });
    this.bus.emit('notify', { text: `任務接受：${QUESTS[id].title}` });
    this.refreshTrackedObjective();
  }

  advanceObjective(id: string): void {
    const s = this.getState(id);
    if (s.status !== 'active') return;
    const def = QUESTS[id];
    if (s.objectiveIndex < def.objectives.length - 1) {
      s.objectiveIndex += 1;
      this.bus.emit('quest-updated', { questId: id });
      this.bus.emit('notify', { text: `任務更新：${def.objectives[s.objectiveIndex].text}` });
    }
    this.refreshTrackedObjective();
  }

  incrementCounter(id: string, key: string): number {
    const s = this.getState(id);
    s.counters[key] = (s.counters[key] ?? 0) + 1;
    this.state.set(id, s);
    return s.counters[key];
  }

  getCounter(id: string, key: string): number {
    return this.getState(id).counters[key] ?? 0;
  }

  completeQuest(id: string): void {
    const s = this.getState(id);
    if (s.status === 'completed') return;
    s.status = 'completed';
    this.state.set(id, s);
    const def = QUESTS[id];
    def.rewardItems.forEach((itemId) => this.inventory.addItem(itemId as any, 1));
    this.bus.emit('quest-completed', { questId: id });
    this.refreshTrackedObjective();
  }

  /** Emits the objective text that should currently be shown in the HUD tracker. */
  refreshTrackedObjective(): void {
    const main = this.getState('main_ledger');
    if (main.status === 'active') {
      const def = QUESTS.main_ledger;
      this.bus.emit('objective-changed', { text: this.formatObjectiveText('main_ledger', def, main) });
      return;
    }
    for (const [id, s] of this.state) {
      if (s.status === 'active') {
        const def = QUESTS[id];
        this.bus.emit('objective-changed', { text: this.formatObjectiveText(id, def, s) });
        return;
      }
    }
    if (main.status === 'completed') {
      this.bus.emit('objective-changed', {
        text: '自由探索古城，尋找隱藏的歷史知識點。\nFreely explore the city and find hidden history notes.',
      });
    } else {
      this.bus.emit('objective-changed', {
        text: '尋找茶館老闆，了解他遇到的麻煩。\nFind the tea house owner and learn about his trouble.',
      });
    }
  }

  private formatObjectiveText(id: string, def: QuestDef, s: QuestRuntimeState): string {
    const obj = def.objectives[s.objectiveIndex];
    if (!obj) return '';
    if (id === 'main_ledger' && obj.id === 'question_npcs') {
      const count = s.counters.witnesses ?? 0;
      return obj.text.replace('(0/3)', `(${count}/3)`);
    }
    return obj.text;
  }

  serialize(): Record<string, QuestRuntimeState> {
    const out: Record<string, QuestRuntimeState> = {};
    this.state.forEach((v, k) => (out[k] = v));
    return out;
  }

  deserialize(
    data: Record<string, { status: string; objectiveIndex: number; counters: Record<string, number> }> | undefined,
  ): void {
    if (!data) return;
    Object.entries(data).forEach(([id, v]) => {
      if (this.state.has(id)) {
        this.state.set(id, {
          status: v.status as QuestStatus,
          objectiveIndex: v.objectiveIndex,
          counters: v.counters ?? {},
        });
      }
    });
  }
}
